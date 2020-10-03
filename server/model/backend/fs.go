package backend

import (
	"io"
	"os"
	"path/filepath"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var FsCache AppCache

func init() {
	Backend.Register("fs", Fs{})

	FsCache = NewAppCache(2, 1)
	FsCache.OnEvict(func(key string, value interface{}) {
		c := value.(*Fs)
		c.Close()
	})
}

type Fs struct {
	rootPath string
}

func (fs Fs) Init(params map[string]string, app *App) (IBackend, error) {
	if c := FsCache.Get(params); c != nil {
		d := c.(*Fs)
		return d, nil
	}
	if params["root_path"] == "" {
		params["root_path"] = "dist/data/files"
	}

	var backend *Fs = nil

	// Attempt to access path
	stat, err := os.Stat(params["root_path"])
	if err == nil && stat.IsDir() {
		backend = &Fs{rootPath: params["root_path"]}
	}
	if os.IsNotExist(err) {
		if os.MkdirAll(params["root_path"], os.ModePerm) == nil {
			backend = &Fs{rootPath: params["root_path"]}
		}
	}

	FsCache.Set(params, backend)
	return backend, nil
}

func (fs Fs) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:  "type",
				Type:  "hidden",
				Value: "fs",
			},
			FormElement{
				Name:        "root_path",
				Type:        "text",
				Placeholder: "Path",
			},
		},
	}
}

func (fs Fs) Home() (string, error) {
	return "/", nil
}

func (fs Fs) Ls(path string) ([]os.FileInfo, error) {
	f, err := os.Open(filepath.Join(fs.rootPath, path))
	if err != nil {
		return nil, err
	}
	defer f.Close()

	return f.Readdir(0)
}

func (fs Fs) Cat(path string) (io.ReadCloser, error) {
	return os.Open(filepath.Join(fs.rootPath, path))
}

func (fs Fs) Mkdir(path string) error {
	return os.Mkdir(filepath.Join(fs.rootPath, path), os.ModePerm)
}

func (fs Fs) Rm(path string) error {
	return os.RemoveAll(filepath.Join(fs.rootPath, path))
}

func (fs Fs) Mv(from string, to string) error {
	return os.Rename(filepath.Join(fs.rootPath, from), filepath.Join(fs.rootPath, to))
}

func (fs Fs) Touch(path string) error {
	_, err := os.Create(filepath.Join(fs.rootPath, path)) // TODO this also truncates the file if it already exists
	return err
}

func (fs Fs) Save(path string, file io.Reader) error {
	f, err := os.Create(filepath.Join(fs.rootPath, path))
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = f.ReadFrom(file)
	return err
}

func (fs Fs) Close() error {
	return nil
}
