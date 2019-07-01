package plg_backend_ftps

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/secsy/goftp"
	"io"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var FtpsCache AppCache

type Ftps struct {
	client *goftp.Client
}

func init() {
	Backend.Register("ftps", Ftps{})

	FtpsCache = NewAppCache(2, 1)
	FtpsCache.OnEvict(func(key string, value interface{}) {
		c := value.(*Ftps)
		c.Close()
	})
}

func (f Ftps) Init(params map[string]string, app *App) (IBackend, error) {
	if c := FtpsCache.Get(params); c != nil {
		d := c.(*Ftps)
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

	config := goftp.Config{
		User:               params["username"],
		Password:           params["password"],
		ConnectionsPerHost: conn,
		Timeout:            10 * time.Second,
		TLSMode:            goftp.TLSImplicit,
	}
	client, err := goftp.DialConfig(config, fmt.Sprintf("%s:%s", params["hostname"], params["port"]))
	if err != nil {
		return nil, err
	}
	backend := Ftps{client}

	FtpsCache.Set(params, &backend)
	return backend, nil
}

func (f Ftps) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:        "type",
				Type:        "hidden",
				Value:       "ftps",
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
				Target:      []string{"ftps_path", "ftps_port", "ftps_conn"},
			},
			FormElement{
				Id:          "ftps_path",
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
			FormElement{
				Id:          "ftps_port",
				Name:        "port",
				Type:        "number",
				Placeholder: "Port",
			},
			FormElement{
				Id:          "ftps_conn",
				Name:        "conn",
				Type:        "number",
				Placeholder: "Number of connections",
			},
		},
	}
}

func (f Ftps) Home() (string, error) {
	return f.client.Getwd()
}

func (f Ftps) Ls(path string) ([]os.FileInfo, error) {
	return f.client.ReadDir(path)
}

func (f Ftps) Cat(path string) (io.ReadCloser, error) {
	pr, pw := io.Pipe()
	go func() {
		if err := f.client.Retrieve(path, pw); err != nil {
			pr.CloseWithError(NewError("Problem", 409))
		}
		pw.Close()
	}()
	return pr, nil
}

func (f Ftps) Mkdir(path string) error {
	_, err := f.client.Mkdir(path)
	return err
}

func (f Ftps) Rm(path string) error {
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

func (f Ftps) Mv(from string, to string) error {
	return f.client.Rename(from, to)
}

func (f Ftps) Touch(path string) error {
	return f.client.Store(path, strings.NewReader(""))
}

func (f Ftps) Save(path string, file io.Reader) error {
	return f.client.Store(path, file)
}

func (f Ftps) Close() error {
	return f.client.Close()
}
