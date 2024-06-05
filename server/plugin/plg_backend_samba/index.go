package plg_backend_samba

import (
	"fmt"
	"io"
	"net"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/hirochachacha/go-smb2"
	. "github.com/mickael-kerjean/filestash/server/common"
)

var SambaCache AppCache

func init() {
	Backend.Register("samba", Samba{})

	SambaCache = NewAppCache(30)
	SambaCache.OnEvict(func(key string, value interface{}) {
		smb := value.(*Samba)
		for key, _ := range smb.share {
			if err := smb.share[key].Umount(); err != nil {
				Log.Warning("samba: error unmounting share: %v", err)
			}
		}
		if err := smb.session.Logoff(); err != nil {
			Log.Warning("samba: error logging out: %v", err)
		}
	})
}

type Samba struct {
	session *smb2.Session
	share   map[string]*smb2.Share
}

func (smb Samba) Init(params map[string]string, app *App) (IBackend, error) {
	if c := SambaCache.Get(params); c != nil {
		return c.(*Samba), nil
	}
	if strings.HasPrefix(params["host"], "smb://") == false {
		params["host"] = "smb://" + params["host"]
	}
	if u, err := url.Parse(params["host"]); err == nil {
		params["host"] = u.Host
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

	host := fmt.Sprintf("%s:%s", params["host"], params["port"])
	conn, err := net.DialTimeout("tcp", host, 10*time.Second)
	if err != nil {
		Log.Debug("plg_backend_samba::netdial host[%s] err[%s]", host, err.Error())
		return nil, err
	}

	s := &Samba{nil, make(map[string]*smb2.Share, 0)}
	s.session, err = (&smb2.Dialer{
		Initiator: &smb2.NTLMInitiator{
			User: func() string {
				if params["username"] == "" {
					return "Guest"
				}
				return params["username"]
			}(),
			Password: params["password"],
			Domain:   params["domain"],
		},
	}).Dial(conn)
	if err != nil {
		Log.Debug("plg_backend_samba::smbdial host[%s] err[%s] username[%s] domain[%s]", host, err.Error(), params["username"], params["domain"])
		return nil, err
	}
	if params["share"] == "" {
		names, err := s.session.ListSharenames()
		if err != nil {
			Log.Debug("plg_backend_samba::list host[%s] err[%s]", host, err.Error())
			return nil, err
		}
		for _, name := range names {
			if strings.HasSuffix(name, "$") {
				continue
			}
			if m, err := s.session.Mount(name); err == nil {
				s.share[name] = m
			}
		}
	} else {
		if m, err := s.session.Mount(params["share"]); err == nil {
			s.share[params["share"]] = m
		}
	}
	SambaCache.Set(params, s)
	return s, nil
}

func (smb Samba) LoginForm() Form {
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
				Target:      []string{"samba_port", "samba_path", "samba_domain", "samba_share"},
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
		},
	}
}

func (smb Samba) Ls(path string) ([]os.FileInfo, error) {
	if path == "/" {
		f := make([]os.FileInfo, 0)
		for key, _ := range smb.share {
			f = append(f, File{
				FName: key,
				FType: "directory",
			})
		}
		return f, nil
	}
	share, path, err := smb.toSambaPath(path)
	if err != nil {
		return nil, err
	}

	dir, err := share.Open(path)
	if err != nil {
		return nil, fromSambaErr(err)
	}
	defer dir.Close()

	fs, err := dir.Readdir(-1)
	return fs, fromSambaErr(err)
}

func (smb Samba) Cat(path string) (io.ReadCloser, error) {
	share, path, err := smb.toSambaPath(path)
	if err != nil {
		return nil, err
	}

	f, err := share.Open(path)
	return f, fromSambaErr(err)
}

func (smb Samba) Mkdir(path string) error {
	share, path, err := smb.toSambaPath(path)
	if err != nil {
		return err
	}
	return fromSambaErr(share.Mkdir(path, os.ModeDir))
}

func (smb Samba) Rm(path string) error {
	share, path, err := smb.toSambaPath(path)
	if err != nil {
		return err
	}
	return fromSambaErr(share.RemoveAll(path))
}

func (smb Samba) Mv(from, to string) error {
	fromShare, fromPath, err := smb.toSambaPath(from)
	if err != nil {
		return err
	}
	toShare, toPath, err := smb.toSambaPath(to)
	if err != nil {
		return err
	}
	if fromShare != toShare {
		return ErrNotImplemented
	}
	return fromSambaErr(fromShare.Rename(fromPath, toPath))
}

func (smb Samba) Save(path string, content io.Reader) error {
	share, path, err := smb.toSambaPath(path)
	if err != nil {
		return err
	}
	f, err := share.Create(path)
	if err != nil {
		return fromSambaErr(err)
	}
	if _, err = io.Copy(f, content); err != nil {
		f.Close()
		return fromSambaErr(err)
	}
	return f.Close()
}

func (smb Samba) Touch(path string) error {
	share, path, err := smb.toSambaPath(path)
	if err != nil {
		return err
	}
	f, err := share.Create(path)
	if err != nil {
		return fromSambaErr(err)
	}
	return fromSambaErr(f.Close())
}

func (smb Samba) toSambaPath(path string) (*smb2.Share, string, error) {
	p := strings.Split(strings.Trim(path, "/"), "/")
	if len(p) == 0 {
		return nil, "", ErrNotAllowed
	}
	sharename := p[0]
	oPath := strings.TrimLeft(strings.Join(p[1:], "\\"), "\\")
	if smb.share[sharename] == nil {
		return nil, "", ErrNotFound
	}
	return smb.share[sharename], oPath, nil
}

func fromSambaErr(err error) error {
	switch {
	case os.IsPermission(err):
		return ErrPermissionDenied
	case os.IsNotExist(err):
		return ErrNotFound
	default:
		return err
	}
}
