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

	configWithoutTLS := goftp.Config{
		User:               params["username"],
		Password:           params["password"],
		ConnectionsPerHost: conn,
		Timeout:            10 * time.Second,
	}
	configWithTLS := configWithoutTLS
	configWithTLS.TLSConfig = &tls.Config{
		InsecureSkipVerify: true,
		ClientSessionCache: tls.NewLRUClientSessionCache(32),
	}
	configWithTLS.TLSMode = goftp.TLSExplicit

	var backend *Ftp = nil

	// Attempt to connect using FTPS
	if client, err := goftp.DialConfig(configWithTLS, fmt.Sprintf("%s:%s", strings.TrimPrefix(params["hostname"], "ftps://"), params["port"])); err == nil {
		if _, err := client.ReadDir("/"); err != nil {
			client.Close()
		} else {
			backend = &Ftp{client, params, nil}
		}
	}

	// Attempt to create an FTP connection if FTPS isn't available
	if backend == nil {
		client, err := goftp.DialConfig(configWithoutTLS, fmt.Sprintf("%s:%s", strings.TrimPrefix(params["hostname"], "ftp://"), params["port"]))
		if err != nil {
			return backend, err
		}
		if _, err := client.ReadDir("/"); err != nil {
			client.Close()
			return backend, ErrAuthenticationFailed
		}
		backend = &Ftp{client, params, nil}
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
