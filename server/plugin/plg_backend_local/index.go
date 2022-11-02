package plg_backend_local

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/crypto/bcrypt"
	"io"
	"os"
)

func init() {
	Backend.Register("local", Local{})
}

type Local struct{}

func (this Local) Init(params map[string]string, app *App) (IBackend, error) {
	if err := bcrypt.CompareHashAndPassword(
		[]byte(Config.Get("auth.admin").String()),
		[]byte(params["password"]),
	); err != nil {
		return nil, ErrAuthenticationFailed
	}
	return Local{}, nil
}

func (this Local) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "local",
			},
			{
				Name:        "password",
				Type:        "password",
				Placeholder: "Admin Password",
			},
			{
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
		},
	}
}

func (this Local) Home() (string, error) {
	return os.UserHomeDir()
}

func (this Local) Ls(path string) ([]os.FileInfo, error) {
	f, err := SafeOsOpenFile(path, os.O_RDONLY, os.ModePerm)
	if err != nil {
		return nil, err
	}
	return f.Readdir(-1)
}

func (this Local) Cat(path string) (io.ReadCloser, error) {
	return SafeOsOpenFile(path, os.O_RDONLY, os.ModePerm)
}

func (this Local) Mkdir(path string) error {
	return SafeOsMkdir(path, 0755)
}

func (this Local) Rm(path string) error {
	return SafeOsRemoveAll(path)
}

func (this Local) Mv(from, to string) error {
	return SafeOsRename(from, to)
}

func (this Local) Save(path string, content io.Reader) error {
	f, err := SafeOsOpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, os.ModePerm)
	if err != nil {
		return err
	}
	_, err = io.Copy(f, content)
	return err
}

func (this Local) Touch(path string) error {
	f, err := SafeOsOpenFile(path, os.O_WRONLY|os.O_CREATE, os.ModePerm)
	if err != nil {
		return err
	}
	if _, err = f.Write([]byte("")); err != nil {
		f.Close()
		return err
	}
	return f.Close()
}
