package plg_backend_syncthing

import (
	"io"
	"net/http"
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Backend.Register("syncthing", &Syncthing{})
}

type Syncthing struct {
	baseURL  string
	apiKey   string
	client   *http.Client
	syncPath string
	folders  []SyncFolder
}

func (s *Syncthing) Init(params map[string]string, app *App) (IBackend, error) {
	url := params["url"]
	if url == "" {
		url = "http://localhost:8384"
	}
	backend := &Syncthing{
		baseURL:  url,
		apiKey:   params["api_key"],
		syncPath: params["sync_path"],
		client:   &http.Client{},
	}
	var err error
	backend.folders, err = backend.fetchFolders()
	if err != nil {
		return nil, err
	}
	return backend, nil
}

func (s *Syncthing) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "syncthing",
			},
			{
				Name:        "url",
				Type:        "text",
				Placeholder: "Address",
			},
			{
				Name:        "api_key",
				Type:        "text",
				Placeholder: "API Key",
			},
			{
				Name:        "sync_path",
				Type:        "text",
				Placeholder: "Sync directory",
			},
		},
	}
}

func (s *Syncthing) Meta(path string) Metadata {
	if path == "/" || s.syncPath == "" {
		return Metadata{
			CanCreateDirectory: NewBool(false),
			CanCreateFile:      NewBool(false),
			CanRename:          NewBool(false),
			CanMove:            NewBool(false),
			CanUpload:          NewBool(false),
			CanDelete:          NewBool(false),
		}
	}
	return Metadata{}
}

func (s *Syncthing) Ls(path string) ([]os.FileInfo, error) {
	if path == "/" {
		var fileInfos []os.FileInfo
		for _, folder := range s.folders {
			fileInfos = append(fileInfos, &File{
				FName: folder.Name,
				FType: "directory",
			})
		}
		return fileInfos, nil
	}
	if s.syncPath != "" {
		fullpath, err := s.resolvePath(path)
		if err != nil {
			return nil, err
		}
		f, err := SafeOsOpenFile(fullpath, os.O_RDONLY, os.ModePerm)
		if err != nil {
			return nil, err
		}
		files, err := f.Readdir(-1)
		if err != nil {
			f.Close()
			return nil, err
		}
		return files, f.Close()
	}
	return s.listDirectory(path)
}

func (s *Syncthing) Stat(path string) (os.FileInfo, error) {
	fullpath, err := s.resolvePath(path)
	if err != nil {
		return nil, err
	}
	f, err := SafeOsOpenFile(fullpath, os.O_RDONLY, os.ModePerm)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return f.Stat()
}

func (s *Syncthing) Cat(path string) (io.ReadCloser, error) {
	fullpath, err := s.resolvePath(path)
	if err != nil {
		return nil, err
	}
	f, err := SafeOsOpenFile(fullpath, os.O_RDONLY, os.ModePerm)
	if err != nil {
		return nil, err
	}
	fs, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, err
	}
	if fs.IsDir() {
		f.Close()
		return nil, ErrNotFound
	}
	return f, nil
}

func (s *Syncthing) Mkdir(path string) error {
	fullpath, err := s.resolvePath(path)
	if err != nil {
		return err
	}
	return SafeOsMkdir(fullpath, 0755)
}

func (s *Syncthing) Rm(path string) error {
	fullpath, err := s.resolvePath(path)
	if err != nil {
		return err
	}
	return SafeOsRemoveAll(fullpath)
}

func (s *Syncthing) Mv(from, to string) error {
	fromPath, err := s.resolvePath(from)
	if err != nil {
		return err
	}
	toPath, err := s.resolvePath(to)
	if err != nil {
		return err
	}
	return SafeOsRename(fromPath, toPath)
}

func (s *Syncthing) Save(path string, content io.Reader) error {
	fullpath, err := s.resolvePath(path)
	if err != nil {
		return err
	}
	f, err := SafeOsOpenFile(fullpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0664)
	if err != nil {
		return err
	}
	if _, err = io.Copy(f, content); err != nil {
		f.Close()
		return err
	}
	return f.Close()
}

func (s *Syncthing) Touch(path string) error {
	fullpath, err := s.resolvePath(path)
	if err != nil {
		return err
	}
	f, err := SafeOsOpenFile(fullpath, os.O_WRONLY|os.O_CREATE, os.ModePerm)
	if err != nil {
		return err
	}
	return f.Close()
}
