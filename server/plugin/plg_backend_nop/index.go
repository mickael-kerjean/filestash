package plg_backend_nop

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"os"
)

func init() {
	Backend.Register("blackhole", BlackHole{})
}

type BlackHole struct{}

func (this BlackHole) Init(params map[string]string, app *App) (IBackend, error) {
	return BlackHole{}, nil
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
	return []os.FileInfo{}, nil
}

func (this BlackHole) Cat(path string) (io.ReadCloser, error) {
	return nil, ErrNotImplemented
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
	b := make([]byte, 32<<20) // 32MB
	for {
		_, err := content.Read(b)
		if err == io.EOF {
			break
		}
	}
	return nil
}

func (this BlackHole) Touch(path string) error {
	return nil
}
