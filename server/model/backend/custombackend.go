package backend

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"io"
	"os"
	"strings"
)

type CustomBackend struct {
}

func NewCustomBackend(params map[string]string, app *App) (*CustomBackend, error) {
	return &CustomBackend{}, nil
}

func (b CustomBackend) Info() string {
	return "N/A"
}

func (b CustomBackend) Ls(path string) ([]os.FileInfo, error) {
	return nil, NewError("", 401)
}

func (b CustomBackend) Cat(path string) (io.Reader, error) {
	return strings.NewReader(""), NewError("", 401)
}
func (b CustomBackend) Mkdir(path string) error {
	return NewError("", 401)
}
func (b CustomBackend) Rm(path string) error {
	return NewError("", 401)
}
func (b CustomBackend) Mv(from string, to string) error {
	return NewError("", 401)
}
func (b CustomBackend) Touch(path string) error {
	return NewError("", 401)
}
func (b CustomBackend) Save(path string, file io.Reader) error {
	return NewError("", 401)
}
