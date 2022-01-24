package plg_backend_office

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Backend.Register("office", OfficeStorage{})
}

type OfficeStorage struct{}

func (this OfficeStorage) Init(params map[string]string, app *App) (IBackend, error) {
	if params["id"] == "" {
		return nil, ErrNotAuthorised
	}
	// make directory for userID
	return OfficeStorage{}, nil
}

func (this OfficeStorage) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "office",
			},
			{
				Name: "userID",
				Type: "text",
			},
		},
	}
}

func (this OfficeStorage) Ls(path string) ([]os.FileInfo, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	return f.Readdir(-1)
}

func (this OfficeStorage) Cat(path string) (io.ReadCloser, error) {
	return os.OpenFile(path, os.O_RDONLY, os.ModePerm)
}

func (this OfficeStorage) Mkdir(path string) error {
	return os.Mkdir(path, 0664)
}

func (this OfficeStorage) Rm(path string) error {
	return os.Remove(path)
}

func (this OfficeStorage) Mv(from, to string) error {
	return os.Rename(from, to)
}

func (this OfficeStorage) Save(path string, content io.Reader) error {
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, os.ModePerm)
	if err != nil {
		return err
	}
	_, err = io.Copy(f, content)
	return err
}

func (this OfficeStorage) Touch(path string) error {
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE, os.ModePerm)
	if err != nil {
		return err
	}
	if _, err = f.Write([]byte("")); err != nil {
		f.Close()
		return err
	}
	return f.Close()
}
