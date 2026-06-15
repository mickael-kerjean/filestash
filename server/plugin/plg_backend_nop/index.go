package plg_backend_nop

import (
	"io"
	"os"
	"path/filepath"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Backend.Register("blackhole", BlackHole{})
}

type BlackHole struct{}

func (this BlackHole) Init(params map[string]string, app *App) (IBackend, error) {
	Log.Debug("plg_backend_nop::init params[%s]", params)
	return &BlackHole{}, nil
}

func (this BlackHole) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "blackhole",
			},
		},
	}
}

func (this BlackHole) Ls(path string) ([]os.FileInfo, error) {
	files := make([]os.FileInfo, 0)
	files = append(
		files,
		File{FName: "1M.bin", FType: "file", FSize: 1024 * 1024},
		File{FName: "10M.bin", FType: "file", FSize: 1024 * 1024 * 10},
		File{FName: "100M.bin", FType: "file", FSize: 1024 * 1024 * 100},
		File{FName: "1G.bin", FType: "file", FSize: 1024 * 1024 * 1024},
		File{FName: "10G.bin", FType: "file", FSize: 1024 * 1024 * 1024 * 1024},
		File{FName: "100G.bin", FType: "file", FSize: 1024 * 1024 * 1024 * 1024 * 1024},
	)
	return files, nil
}

func (this BlackHole) Stat(path string) (os.FileInfo, error) {
	s, err := getSize(path)
	return File{FName: filepath.Base(path), FType: "file", FSize: s}, err
}

func (this BlackHole) Cat(path string) (io.ReadCloser, error) {
	s, err := getSize(path)
	return &LargeFile{s}, err
}

func (this BlackHole) Mkdir(path string) error {
	return nil
}

func (this BlackHole) Rm(path string) error {
	return ErrNotImplemented
}

func (this BlackHole) Mv(from, to string) error {
	return ErrNotImplemented
}

func (this BlackHole) Save(path string, content io.Reader) error {
	_, err := io.Copy(io.Discard, content)
	return err
}

func (this BlackHole) Touch(path string) error {
	return nil
}
