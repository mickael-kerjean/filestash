package core

import (
	"io"
	"os"
)

type IBackend interface {
	Init(params map[string]string, app *App) (IBackend, error)
	Ls(path string) ([]os.FileInfo, error)
	Stat(path string) (os.FileInfo, error)
	Cat(path string) (io.ReadCloser, error)
	Mkdir(path string) error
	Rm(path string) error
	Mv(from string, to string) error
	Save(path string, file io.Reader) error
	Touch(path string) error
	LoginForm() Form
}
