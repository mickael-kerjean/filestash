package plg_backend_samba

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/hirochachacha/go-smb2/v2"
	"github.com/hirochachacha/go-smb2/v2/auth"
)

var SambaCache AppCache

func init() {
	Backend.Register("samba", Samba{})

	SambaCache = NewAppCache()
	SambaCache.OnEvict(func(key string, value interface{}) {
		smb := value.(*Samba)
		if smb.inflight.Load() != 0 {
			SambaCache.SetKey(key, smb)
			return
		}
		for key, _ := range smb.share {
			if err := smb.share[key].Unmount(context.Background()); err != nil {
				Log.Warning("samba: error unmounting share: %v", err)
			}
		}
		if err := smb.session.Close(); err != nil {
			Log.Warning("samba: error logging out: %v", err)
		}
		if smb.kerberos != nil {
			smb.kerberos.Close()
		}
	})
}

type Samba struct {
	share    map[string]*smb2.Share
	inflight *atomic.Int32
	session  *smb2.Session
	kerberos *auth.KerberosCredential
	app      *App
}

func (this Samba) Init(params map[string]string, app *App) (IBackend, error) {
	if strings.HasPrefix(params["host"], "smb://") == false {
		params["host"] = "smb://" + params["host"]
	}
	if u, err := url.Parse(params["host"]); err == nil {
		params["host"] = u.Hostname()
		if params["port"] == "" {
			params["port"] = u.Port()
		}
		if params["share"] == "" {
			params["share"] = strings.ReplaceAll(u.Path, "/", "")
		}
		if params["username"] == "" && u.User != nil {
			params["username"] = u.User.Username()
		}
		if params["password"] == "" && u.User != nil {
			params["password"], _ = u.User.Password()
		}
	}
	if params["port"] == "" {
		params["port"] = "445"
	}
	if c := SambaCache.Get(params); c != nil {
		out := *c.(*Samba)
		out.app = app
		return &out, nil
	}

	host := fmt.Sprintf("%s:%s", params["host"], params["port"])
	port, err := strconv.Atoi(params["port"])
	if err != nil {
		port = 445
	}
	var cred smb2.Credentials = &auth.NTLMCredential{
		User: func() string {
			if params["username"] == "" {
				return "Guest"
			}
			return params["username"]
		}(),
		Password: params["password"],
		Domain:   NewString(params["domain"]),
	}
	if params["kerberos"] != "" {
		krb5Path := GetAbsolutePath(TMP_PATH, "krb5_"+Hash(params["kerberos"], 16)+".conf")
		if err = os.WriteFile(krb5Path, []byte(params["kerberos"]), 0600); err != nil {
			Log.Debug("plg_backend_samba::fs action=write error=%q", err)
			return nil, err
		}
		if this.kerberos, err = auth.NewKerberosCredential(auth.KerberosPassword{
			ConfigFile: krb5Path,
			User:       params["username"],
			Realm:      params["domain"],
			Password:   params["password"],
		}); err != nil {
			Log.Debug("plg_backend_samba::kerberos action=new error=%q", err)
			return nil, err
		}
		cred = this.kerberos
	}

	this.app = app
	this.inflight = &atomic.Int32{}
	this.share = make(map[string]*smb2.Share, 0)
	this.session, err = (&smb2.Dialer{
		Credentials: cred,
		TransportDialer: smb2.TCPDialer{
			Port:   port,
			Dialer: &net.Dialer{Timeout: 10 * time.Second},
			Tracer: withTracer(host, params["username"]),
		},
	}).Dial(this.app.Context, params["host"])

	if err != nil {
		if this.kerberos != nil {
			this.kerberos.Close()
		}
		Log.Debug("plg_backend_samba::smbdial host[%s] err[%s] username[%s] domain[%s]", host, err.Error(), params["username"], params["domain"])
		return nil, err
	}
	if params["share"] == "" {
		names, err := this.session.ListShareNames(this.app.Context)
		if err != nil {
			Log.Debug("plg_backend_samba::list host[%s] err[%s]", host, err.Error())
			return nil, err
		}
		for _, name := range names {
			if strings.HasSuffix(name, "$") {
				continue
			}
			if m, err := this.session.Mount(this.app.Context, name); err == nil {
				this.share[name] = m
			}
		}
	} else {
		if m, err := this.session.Mount(this.app.Context, params["share"]); err == nil {
			this.share[params["share"]] = m
		}
	}
	SambaCache.Set(params, &this)
	return &this, nil
}

func (this Samba) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "samba",
			},
			{
				Name:        "host",
				Type:        "text",
				Placeholder: "Hostname",
			},
			{
				Name:        "username",
				Type:        "text",
				Placeholder: "Username",
			},
			{
				Name:        "password",
				Type:        "password",
				Placeholder: "Password",
			},
			{
				Name:        "advanced",
				Type:        "enable",
				Placeholder: "Advanced",
				Target:      []string{"samba_port", "samba_path", "samba_domain", "samba_share", "samba_kerberos"},
			},
			{
				Id:          "samba_path",
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
			{
				Id:          "samba_port",
				Name:        "port",
				Type:        "number",
				Placeholder: "Port - eg: 445",
			},
			{
				Id:          "samba_domain",
				Name:        "domain",
				Type:        "text",
				Placeholder: "Domain",
			},
			{
				Id:          "samba_share",
				Name:        "share",
				Type:        "text",
				Placeholder: "Share Name",
			},
			{
				Id:          "samba_kerberos",
				Name:        "kerberos",
				Type:        "long_text",
				Placeholder: "[libdefaults]\ndefault_realm = EXAMPLE.COM\ndns_lookup_kdc = true",
			},
		},
	}
}

func (this Samba) Ls(path string) ([]os.FileInfo, error) {
	if path == "/" {
		f := make([]os.FileInfo, 0)
		for key, _ := range this.share {
			f = append(f, File{
				FName: key,
				FType: "directory",
			})
		}
		return f, nil
	}
	share, path, err := this.toSambaPath(path)
	if err != nil {
		return nil, err
	}

	dir, err := share.Open(this.app.Context, path)
	if err != nil {
		return nil, fromSambaErr(err)
	}
	defer dir.Close(this.app.Context)

	fs, err := dir.Readdir(this.app.Context, -1)
	return fs, fromSambaErr(err)
}

func (this Samba) Meta(path string) Metadata {
	if path == "/" {
		return Metadata{
			CanCreateFile:      NewBool(false),
			CanCreateDirectory: NewBool(false),
			CanRename:          NewBool(false),
			CanMove:            NewBool(false),
			CanUpload:          NewBool(false),
			CanDelete:          NewBool(false),
		}
	}
	return Metadata{}
}

func (this Samba) Stat(path string) (os.FileInfo, error) {
	if path == "/" {
		for key, _ := range this.share {
			return File{
				FName: key,
				FType: "directory",
				FTime: -1,
				FSize: 0,
			}, nil
		}
		return nil, ErrNotFound
	}
	share, path, err := this.toSambaPath(path)
	if err != nil {
		return nil, err
	}
	f, err := share.Stat(this.app.Context, path)
	return f, fromSambaErr(err)
}

func (this Samba) Cat(path string) (io.ReadCloser, error) {
	share, path, err := this.toSambaPath(path)
	if err != nil {
		return nil, err
	}
	f, err := share.Open(this.app.Context, path)
	if err != nil {
		return nil, fromSambaErr(err)
	}
	return NewReadahead(this.app.Context, f, this.inflight), nil
}

func (this Samba) Mkdir(path string) error {
	share, path, err := this.toSambaPath(path)
	if err != nil {
		return err
	}
	return fromSambaErr(share.Mkdir(this.app.Context, path, os.ModeDir))
}

func (this Samba) Rm(path string) error {
	share, path, err := this.toSambaPath(path)
	if err != nil {
		return err
	}
	return fromSambaErr(share.RemoveAll(this.app.Context, path))
}

func (this Samba) Mv(from, to string) error {
	fromShare, fromPath, err := this.toSambaPath(from)
	if err != nil {
		return err
	}
	toShare, toPath, err := this.toSambaPath(to)
	if err != nil {
		return err
	}
	if fromShare != toShare {
		return ErrNotImplemented
	}
	return fromSambaErr(fromShare.Rename(this.app.Context, fromPath, toPath))
}

func (this Samba) Save(path string, content io.Reader) error {
	this.inflight.Add(1)
	defer this.inflight.Add(-1)
	share, path, err := this.toSambaPath(path)
	if err != nil {
		return err
	}
	f, err := share.Create(this.app.Context, path)
	if err != nil {
		return fromSambaErr(err)
	}
	if _, err = f.ReadFrom(this.app.Context, content); err != nil {
		f.Close(this.app.Context)
		return fromSambaErr(err)
	}
	return f.Close(this.app.Context)
}

func (this Samba) Touch(path string) error {
	share, path, err := this.toSambaPath(path)
	if err != nil {
		return err
	}
	f, err := share.Create(this.app.Context, path)
	if err != nil {
		return fromSambaErr(err)
	}
	return fromSambaErr(f.Close(this.app.Context))
}

func (this Samba) toSambaPath(path string) (*smb2.Share, string, error) {
	p := strings.Split(strings.Trim(path, "/"), "/")
	if len(p) == 0 {
		return nil, "", ErrNotAllowed
	}
	sharename := p[0]
	oPath := strings.TrimLeft(strings.Join(p[1:], "\\"), "\\")
	if this.share[sharename] == nil {
		return nil, "", ErrNotFound
	}
	return this.share[sharename], oPath, nil
}
