package plg_backend_ftp

import (
	"context"
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
	ctx    context.Context
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
			Log.Warning("plg_backend_ftp::ftp is nil on get")
			return nil, ErrInternal
		} else if d.wg == nil {
			Log.Warning("plg_backend_ftp::wg is nil on get")
			return nil, ErrInternal
		}
		d.wg.Add(1)
		d.ctx = app.Context
		go func() {
			<-d.ctx.Done()
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
			backend = &Ftp{client, params, nil, app.Context}
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
			backend = &Ftp{client, params, nil, app.Context}
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
			backend = &Ftp{client, params, nil, app.Context}
			break
		}
	}
	if backend == nil {
		return nil, ErrAuthenticationFailed
	}
	backend.wg = new(sync.WaitGroup)
	backend.wg.Add(1)
	backend.ctx = app.Context
	go func() {
		<-backend.ctx.Done()
		backend.wg.Done()
	}()
	FtpCache.Set(params, backend)
	return backend, nil
}

func (f Ftp) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "ftp",
			},
			{
				Name:        "hostname",
				Type:        "text",
				Placeholder: "Hostname*",
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
				Target:      []string{"ftp_path", "ftp_port", "ftp_conn"},
			},
			{
				Id:          "ftp_path",
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
			{
				Id:          "ftp_port",
				Name:        "port",
				Type:        "number",
				Placeholder: "Port",
			},
			{
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

func (f Ftp) Home() (home string, err error) {
	f.Execute(func(client *goftp.Client) error {
		home, err = f.client.Getwd()
		return err
	})
	return home, err
}

func (f Ftp) Ls(path string) (files []os.FileInfo, err error) {
	f.Execute(func(client *goftp.Client) error {
		files, err = client.ReadDir(path)
		return err
	})
	return files, err
}

func (f Ftp) Cat(path string) (reader io.ReadCloser, err error) {
	fileExists := false
	f.Execute(func(client *goftp.Client) error {
		slashLastIndex := strings.LastIndex(path, "/")
		parentPath := path[0:slashLastIndex]
		filename := path[slashLastIndex+1:]
		var fileInfos []os.FileInfo
		fileInfos, err = client.ReadDir(parentPath)
		if err != nil {
			return err
		} else {
			for _, fileInfo := range fileInfos {
				fileExists = fileExists || fileInfo.Name() == filename
			}
		}

		if fileExists {
			pr, pw := io.Pipe()
			go func() {
				err = client.Retrieve(path, pw)
				if err != nil {
					pr.CloseWithError(NewError("Problem", 409))
				}
				pw.Close()
			}()
			reader = pr
		}

		return nil
	})

	if reader == nil {
		err = NewError(fmt.Sprintf("No file matches path %s", path), 404)
	}

	return reader, err
}

func (f Ftp) Mkdir(path string) (err error) {
	f.Execute(func(client *goftp.Client) error {
		_, err = client.Mkdir(path)
		return err
	})
	return err
}

func (f Ftp) Rm(path string) (err error) {
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
	var recursiveDelete func(client *goftp.Client, _path string) error
	recursiveDelete = func(client *goftp.Client, _path string) error {
		if isDirectory(_path) {
			entries, err := client.ReadDir(_path)
			if transformError(err) != nil {
				return err
			}
			for _, entry := range entries {
				if entry.IsDir() {
					err = recursiveDelete(client, _path+entry.Name()+"/")
					if transformError(err) != nil {
						return err
					}
				} else {
					err = recursiveDelete(client, _path+entry.Name())
					if transformError(err) != nil {
						return err
					}
				}
			}
			err = client.Rmdir(_path)
			return transformError(err)
		}
		err = client.Delete(_path)
		return transformError(err)
	}
	f.Execute(func(client *goftp.Client) error {
		err = recursiveDelete(client, path)
		return err
	})
	return err
}

func (f Ftp) Mv(from string, to string) (err error) {
	f.Execute(func(client *goftp.Client) error {
		err = client.Rename(from, to)
		return err
	})
	return err
}

func (f Ftp) Touch(path string) (err error) {
	f.Execute(func(client *goftp.Client) error {
		err = client.Store(path, strings.NewReader(""))
		return err
	})
	return err
}

func (f Ftp) Save(path string, file io.Reader) (err error) {
	f.Execute(func(client *goftp.Client) error {
		err = client.Store(path, file)
		return err
	})
	return err
}

func (f Ftp) Close() error {
	return f.client.Close()
}

func (f Ftp) Execute(fn func(*goftp.Client) error) {
	err := fn(f.client)
	if ftpErr, ok := err.(goftp.Error); ok {
		code := ftpErr.Code()
		if code == 421 || (code == 0 && err.Error() == "error reading response: EOF") {
			f.Close()
			FtpCache.Set(f.p, nil)
			if b, err := f.Init(f.p, &App{Context: f.ctx}); err == nil {
				fn(b.(*Ftp).client)
			}
		}
	}
}
