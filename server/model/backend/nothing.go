package backend

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"io"
	"os"
	"strings"
)

type Nothing struct {
}

func NewNothing(params map[string]string, app *App) (*Nothing, error) {
	return &Nothing{}, nil
}

func (b Nothing) Info() string {
	return "N/A"
}

func (b Nothing) Ls(path string) ([]os.FileInfo, error) {
	return nil, NewError("", 401)
}

func (b Nothing) Cat(path string) (io.Reader, error) {
	return strings.NewReader(""), NewError("", 401)
}
func (b Nothing) Mkdir(path string) error {
	return NewError("", 401)
}
func (b Nothing) Rm(path string) error {
	return NewError("", 401)
}
func (b Nothing) Mv(from string, to string) error {
	return NewError("", 401)
}
func (b Nothing) Touch(path string) error {
	return NewError("", 401)
}
func (b Nothing) Save(path string, file io.Reader) error {
	return NewError("", 401)
}
