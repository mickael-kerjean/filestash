package plg_backend_ftp

import (
	"crypto/tls"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	//"github.com/secsy/goftp" <- FTP issue with microsoft FTP
	"github.com/prasad83/goftp"
	"io"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

var FtpCache AppCache

type Ftp struct {
	client *goftp.Client
	p      map[string]string
	wg     *sync.WaitGroup
}

func init() {
	Backend.Register("ftp", Ftp{})

	FtpCache = NewAppCache(2, 1)
	FtpCache.OnEvict(func(key string, value interface{}) {
		c := value.(*Ftp)
		if c == nil {
			Log.Warning("plg_backend_ftp::ftp is nil on close")
			return
		} else if c.wg == nil {
			Log.Warning("plg_backend_ftp::wg is nil on close")
			c.Close()
			return
		}
		c.wg.Wait()
		Log.Debug("plg_backend_ftp::vacuum")
		c.Close()
	})
}

func (f Ftp) Init(params map[string]string, app *App) (IBackend, error) {
	if c := FtpCache.Get(params); c != nil {
		d := c.(*Ftp)
		if d == nil {
			Log.Warning("plg_backend_ftp::sftp is nil on get")
			return nil, ErrInternal
		} else if d.wg == nil {
			Log.Warning("plg_backend_ftp::wg is nil on get")
			return nil, ErrInternal
		}
		d.wg.Add(1)
		go func() {
			<-app.Context.Done()
			d.wg.Done()
		}()
		return d, nil
	}
	if params["hostname"] == "" {
		params["hostname"] = "localhost"
	}

	if params["port"] == "" {
		params["port"] = "21"
	}
	if params["username"] == "" {
		params["acl"] = "r"
		params["username"] = "anonymous"
	}
	if params["username"] == "anonymous" && params["password"] == "" {
		params["password"] = "anonymous"
	}
	conn := 5
	if params["conn"] != "" {
		if i, err := strconv.Atoi(params["conn"]); err == nil && i > 0 {
			conn = i
		}
	}

	connectStrategy := []string{"ftp", "ftps::implicit", "ftps::explicit"}
	if strings.HasPrefix(params["hostname"], "ftp://") {
		connectStrategy = []string{"ftp"}
		params["hostname"] = strings.TrimPrefix(params["hostname"], "ftp://")
	} else if strings.HasPrefix(params["hostname"], "ftps://") {
		connectStrategy = []string{"ftps::implicit", "ftps::explicit"}
		params["hostname"] = strings.TrimPrefix(params["hostname"], "ftps://")
	}

	var backend *Ftp = nil
	hostname := fmt.Sprintf("%s:%s", params["hostname"], params["port"])
	cfgBuilder := func(timeout time.Duration, withTLS bool) goftp.Config {
		cfg := goftp.Config{
			User:               params["username"],
			Password:           params["password"],
			ConnectionsPerHost: conn,
			Timeout:            timeout * time.Second,
		}
		cfg.Timeout = timeout
		if withTLS {
			cfg.TLSConfig = &tls.Config{
				InsecureSkipVerify:     true,
				ClientSessionCache:     tls.NewLRUClientSessionCache(0),
				SessionTicketsDisabled: false,
				ServerName:             hostname,
			}
		}
		return cfg
	}
	for i := 0; i < len(connectStrategy); i++ {
		if connectStrategy[i] == "ftp" {
			client, err := goftp.DialConfig(cfgBuilder(5*time.Second, false), hostname)
			if err != nil {
				Log.Debug("plg_backend_ftp::ftp dial %s", err.Error())
				continue
			} else if _, err := client.ReadDir("/"); err != nil {
				client.Close()
				Log.Debug("plg_backend_ftp::ftp verify %s", err.Error())
				continue
			}
			client.Close()
			client, err = goftp.DialConfig(cfgBuilder(60*time.Second, false), hostname)
			if err != nil {
				continue
			}
			params["mode"] = connectStrategy[i]
			backend = &Ftp{client, params, nil}
			break
		} else if connectStrategy[i] == "ftps::implicit" {
			cfg := cfgBuilder(60*time.Second, true)
			cfg.TLSMode = goftp.TLSImplicit
			client, err := goftp.DialConfig(cfg, hostname)
			if err != nil {
				Log.Debug("plg_backend_ftp::ftps::implicit dial %s", err.Error())
				continue
			} else if _, err := client.ReadDir("/"); err != nil {
				Log.Debug("plg_backend_ftp::ftps::implicit verify %s", err.Error())
				client.Close()
				continue
			}
			params["mode"] = connectStrategy[i]
			backend = &Ftp{client, params, nil}
			break
		} else if connectStrategy[i] == "ftps::explicit" {
			cfg := cfgBuilder(5*time.Second, true)
			cfg.TLSMode = goftp.TLSExplicit
			client, err := goftp.DialConfig(cfg, hostname)
			if err != nil {
				Log.Debug("plg_backend_ftp::ftps::explicit dial '%s'", err.Error())
				continue
			} else if _, err := client.ReadDir("/"); err != nil {
				Log.Debug("plg_backend_ftp::ftps::explicit verify %s", err.Error())
				client.Close()
				continue
			}
			client.Close()
			cfg = cfgBuilder(60*time.Second, true)
			cfg.TLSMode = goftp.TLSExplicit
			client, err = goftp.DialConfig(cfg, hostname)
			if err != nil {
				continue
			}
			params["mode"] = connectStrategy[i]
			backend = &Ftp{client, params, nil}
			break
		}
	}
	if backend == nil {
		return nil, ErrAuthenticationFailed
	}
	backend.wg = new(sync.WaitGroup)
	backend.wg.Add(1)
	go func() {
		<-app.Context.Done()
		backend.wg.Done()
	}()
	FtpCache.Set(params, backend)
	return backend, nil
}

func (f Ftp) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:  "type",
				Type:  "hidden",
				Value: "ftp",
			},
			FormElement{
				Name:        "hostname",
				Type:        "text",
				Placeholder: "Hostname*",
			},
			FormElement{
				Name:        "username",
				Type:        "text",
				Placeholder: "Username",
			},
			FormElement{
				Name:        "password",
				Type:        "password",
				Placeholder: "Password",
			},
			FormElement{
				Name:        "advanced",
				Type:        "enable",
				Placeholder: "Advanced",
				Target:      []string{"ftp_path", "ftp_port", "ftp_conn"},
			},
			FormElement{
				Id:          "ftp_path",
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
			FormElement{
				Id:          "ftp_port",
				Name:        "port",
				Type:        "number",
				Placeholder: "Port",
			},
			FormElement{
				Id:          "ftp_conn",
				Name:        "conn",
				Type:        "number",
				Placeholder: "Number of connections",
			},
		},
	}
}

func (f Ftp) Meta(path string) Metadata {
	if f.p["acl"] == "r" {
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

func (f Ftp) Home() (string, error) {
	return f.client.Getwd()
}

func (f Ftp) Ls(path string) ([]os.FileInfo, error) {
	return f.client.ReadDir(path)
}

func (f Ftp) Cat(path string) (io.ReadCloser, error) {
	pr, pw := io.Pipe()
	go func() {
		if err := f.client.Retrieve(path, pw); err != nil {
			pr.CloseWithError(NewError("Problem", 409))
		}
		pw.Close()
	}()
	return pr, nil
}

func (f Ftp) Mkdir(path string) error {
	_, err := f.client.Mkdir(path)
	return err
}

func (f Ftp) Rm(path string) error {
	isDirectory := func(p string) bool {
		return regexp.MustCompile(`\/$`).MatchString(p)
	}
	transformError := func(e error) error {
		// For some reasons bsftp is struggling with the library
		// sometimes returning a 200 OK
		if e == nil {
			return nil
		}
		if obj, ok := e.(goftp.Error); ok {
			if obj.Code() < 300 && obj.Code() > 0 {
				return nil
			}
		}
		return e
	}
	if isDirectory(path) {
		entries, err := f.Ls(path)
		if transformError(err) != nil {
			return err
		}
		for _, entry := range entries {
			if entry.IsDir() {
				err = f.Rm(path + entry.Name() + "/")
				if transformError(err) != nil {
					return err
				}
			} else {
				err = f.Rm(path + entry.Name())
				if transformError(err) != nil {
					return err
				}
			}
		}
		err = f.client.Rmdir(path)
		return transformError(err)
	}
	err := f.client.Delete(path)
	return transformError(err)
}

func (f Ftp) Mv(from string, to string) error {
	return f.client.Rename(from, to)
}

func (f Ftp) Touch(path string) error {
	return f.client.Store(path, strings.NewReader(""))
}

func (f Ftp) Save(path string, file io.Reader) error {
	return f.client.Store(path, file)
}

func (f Ftp) Close() error {
	return f.client.Close()
}
