package backend

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/secsy/goftp"
	"io"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var FtpCache AppCache

func init() {
	Backend.Register("ftp", Ftp{})

	FtpCache = NewAppCache(2, 1)
	FtpCache.OnEvict(func(key string, value interface{}) {
		c := value.(*Ftp)
		c.Close()
	})
}

type Ftp struct {
	client *goftp.Client
}

func (f Ftp) Init(params map[string]string, app *App) (IBackend, error) {
	c := FtpCache.Get(params)
	if c != nil {
		d := c.(*Ftp)
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
		i, err := strconv.Atoi(params["conn"])
		if err == nil && i > 0 {
			conn = i
		}
	}

	config := goftp.Config{
		User:               params["username"],
		Password:           params["password"],
		ConnectionsPerHost: conn,
		Timeout:            10 * time.Second,
	}
	client, err := goftp.DialConfig(config, params["hostname"]+":"+params["port"])
	if err != nil {
		return nil, err
	}
	backend := Ftp{client}

	FtpCache.Set(params, &backend)
	return backend, nil
}

func (f Ftp) Info() string {
	return "ftp"
}

func (f Ftp) Home() (string, error) {
	return f.client.Getwd()
}

func (f Ftp) Ls(path string) ([]os.FileInfo, error) {
	// by default FTP don't seem to mind a readdir on a non existing
	// directory so we first need to make sure the directory exists
	conn, err := f.client.OpenRawConn()
	if err != nil {
		return nil, err
	}
	i, s, err := conn.SendCommand("CWD %s", path)
	if err != nil {
		return nil, NewError(err.Error(), 404)
	} else if i >= 300 {
		return nil, NewError(s, 404)
	}
	return f.client.ReadDir(path)
}

func (f Ftp) Cat(path string) (io.Reader, error) {
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
