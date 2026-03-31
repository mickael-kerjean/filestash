package plg_backend_gdrive

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/net/context"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const gdriveFolderMarker = "application/vnd.google-apps.folder"

type GDrive struct {
	Client *drive.Service
	Config *oauth2.Config
}

func init() {
	Backend.Register("gdrive", GDrive{})
}

func (g GDrive) Init(params map[string]string, app *App) (IBackend, error) {
	backend := GDrive{}

	config := &oauth2.Config{
		Endpoint:     google.Endpoint,
		ClientID:     Config.Get("auth.gdrive.client_id").Default(os.Getenv("GDRIVE_CLIENT_ID")).String(),
		ClientSecret: Config.Get("auth.gdrive.client_secret").Default(os.Getenv("GDRIVE_CLIENT_SECRET")).String(),
		RedirectURL:  "https://" + Config.Get("general.host").String() + "/login",
		Scopes:       []string{"https://www.googleapis.com/auth/drive"},
	}
	if config.ClientID == "" {
		return backend, NewError("Missing Client ID: Contact your admin", 502)
	} else if config.ClientSecret == "" {
		return backend, NewError("Missing Client Secret: Contact your admin", 502)
	} else if config.RedirectURL == "/login" {
		return backend, NewError("Missing Hostname: Contact your admin", 502)
	}

	token := &oauth2.Token{
		AccessToken:  params["token"],
		RefreshToken: params["refresh"],
		Expiry: func(t string) time.Time {
			expiry, err := strconv.ParseInt(t, 10, 64)
			if err != nil {
				return time.Now()
			}
			return time.Unix(expiry, 0)
		}(params["expiry"]),
		TokenType: "bearer",
	}
	client := config.Client(context.Background(), token)
	srv, err := drive.New(client)
	if err != nil {
		return nil, NewError(err.Error(), 400)
	}
	backend.Client = srv
	backend.Config = config
	return backend, nil
}

func (g GDrive) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:  "type",
				Type:  "hidden",
				Value: "gdrive",
			},
			FormElement{
				ReadOnly: true,
				Name:     "oauth2",
				Type:     "text",
				Value:    "/api/session/auth/gdrive",
			},
			FormElement{
				ReadOnly: true,
				Name:     "image",
				Type:     "image",
				Value:    "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTM5IDEyMC40IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4KICA8cGF0aCBkPSJtMjQuMiAxMjAuNC0yNC4yLTQxLjkgNDUuMy03OC41IDI0LjIgNDEuOXoiIGZpbGw9IiMwZGE5NjAiLz4KICA8cGF0aCBkPSJtNTguOSA2MC4yIDEwLjYtMTguMy0yNC4yLTQxLjl6IiBmaWxsPSIjMGRhOTYwIi8+CiAgPHBhdGggZD0ibTI0LjIgMTIwLjQgMjQuMi00MS45aDkwLjZsLTI0LjIgNDEuOXoiIGZpbGw9IiMyZDZmZGQiLz4KICA8cGF0aCBkPSJtNjkuNSA3OC41aC0yMS4xbDEwLjUtMTguMy0zNC43IDYwLjJ6IiBmaWxsPSIjMmQ2ZmRkIi8+ICAKICA8cGF0aCBkPSJtMTM5IDc4LjVoLTQ4LjRsLTQ1LjMtNzguNWg0OC40eiIgZmlsbD0iI2ZmZDI0ZCIvPgogIDxwYXRoIGQ9Im05MC42IDc4LjVoNDguNGwtNTguOS0xOC4zeiIgZmlsbD0iI2ZmZDI0ZCIvPgo8L3N2Zz4K",
			},
		},
	}
}

func (g GDrive) OAuthURL() string {
	return g.Config.AuthCodeURL("gdrive", oauth2.AccessTypeOnline)
}

func (g GDrive) OAuthToken(ctx *map[string]interface{}) error {
	code := ""
	if str, ok := (*ctx)["code"].(string); ok {
		code = str
	}

	token, err := g.Config.Exchange(oauth2.NoContext, code)
	if err != nil {
		return err
	}
	(*ctx)["token"] = token.AccessToken
	(*ctx)["refresh"] = token.RefreshToken
	(*ctx)["expiry"] = strconv.FormatInt(token.Expiry.UnixNano()/1000, 10)
	delete(*ctx, "code")
	return nil
}

func (g GDrive) Ls(path string) ([]os.FileInfo, error) {
	files := make([]os.FileInfo, 0)
	file, err := g.infoPath(path)
	if err != nil {
		return nil, err
	}
	res, err := g.Client.Files.List().Q("'" + file.id + "' in parents AND trashed = false").Fields("nextPageToken, files(name, size, modifiedTime, mimeType)").PageSize(500).Do()
	if err != nil {
		return nil, NewError(err.Error(), 404)
	}
	for _, obj := range res.Files {
		files = append(files, File{
			FName: obj.Name,
			FType: func(mType string) string {
				if mType == gdriveFolderMarker {
					return "directory"
				}
				return "file"
			}(obj.MimeType),
			FTime: func(t string) int64 {
				a, err := time.Parse(time.RFC3339, t)
				if err != nil {
					return 0
				}
				return a.UnixNano() / 1000
			}(obj.ModifiedTime),
			FSize: obj.Size,
		})
	}
	return files, nil
}

func (g GDrive) Stat(path string) (os.FileInfo, error) {
	return nil, ErrNotImplemented
}

func (g GDrive) Cat(path string) (io.ReadCloser, error) {
	file, err := g.infoPath(path)
	if err != nil {
		return nil, err
	}
	if strings.HasPrefix(file.mType, "application/vnd.google-apps") {
		mType := "text/plain"
		if file.mType == "application/vnd.google-apps.spreadsheet" {
			mType = "text/csv"
		}
		data, err := g.Client.Files.Export(file.id, mType).Download()
		if err != nil {
			return nil, err
		}
		return data.Body, nil
	}

	data, err := g.Client.Files.Get(file.id).Download()
	if err != nil {
		return nil, err
	}
	return data.Body, nil
}

func (g GDrive) Mkdir(path string) error {
	parent, err := g.infoPath(getParentPath(path))
	if err != nil {
		return NewError("Directory already exists", 409)
	}
	_, err = g.Client.Files.Create(&drive.File{
		Name:     filepath.Base(path),
		Parents:  []string{parent.id},
		MimeType: gdriveFolderMarker,
	}).Do()
	return err
}

func (g GDrive) Rm(path string) error {
	file, err := g.infoPath(path)
	if err != nil {
		return err
	}
	if err = g.Client.Files.Delete(file.id).Do(); err != nil {
		return err
	}
	return nil
}

func (g GDrive) Mv(from string, to string) error {
	ffile, err := g.infoPath(from)
	if err != nil {
		return err
	}
	tfile, err := g.infoPath(getParentPath(to))
	if err != nil {
		return err
	}

	_, err = g.Client.Files.Update(ffile.id, &drive.File{
		Name: filepath.Base(to),
	}).RemoveParents(ffile.parent).AddParents(tfile.id).Do()
	return err
}

func (g GDrive) Touch(path string) error {
	file, err := g.infoPath(getParentPath(path))
	if err != nil {
		return NewError("Base folder not found", 404)
	}

	_, err = g.Client.Files.Create(&drive.File{
		Name:    filepath.Base(path),
		Parents: []string{file.id},
	}).Media(strings.NewReader("")).Do()
	return err
}

func (g GDrive) Save(path string, reader io.Reader) error {
	if file, err := g.infoPath(path); err == nil {
		_, err = g.Client.Files.Update(file.id, &drive.File{}).Media(reader).Do()
		return err
	}

	file, err := g.infoPath(getParentPath(path))
	if err != nil {
		return err
	}
	_, err = g.Client.Files.Create(&drive.File{
		Name:    filepath.Base(path),
		Parents: []string{file.id},
	}).Media(reader).Do()
	return err
}

func (g GDrive) infoPath(p string) (*GDriveMarker, error) {
	FindSolutions := func(level int, folder string) ([]GDriveMarker, error) {
		res, err := g.Client.Files.List().Q("name = '" + folder + "' AND trashed = false").Fields("files(parents, id, name, mimeType)").PageSize(500).Do()
		if err != nil {
			return nil, err
		}
		solutions := make([]GDriveMarker, 0)
		for _, file := range res.Files {
			if len(file.Parents) == 0 {
				continue
			}
			solutions = append(solutions, GDriveMarker{
				file.Id,
				file.Parents[0],
				file.Name,
				level,
				file.MimeType,
			})
		}
		return solutions, nil
	}
	FindRoot := func(level int) ([]GDriveMarker, error) {
		root := make([]GDriveMarker, 0)
		res, err := g.Client.Files.List().Q("'root' in parents").Fields("files(parents, id, name, mimeType)").PageSize(1).Do()
		if err != nil {
			return nil, err
		}

		if len(res.Files) == 0 || len(res.Files[0].Parents) == 0 {
			root = append(root, GDriveMarker{
				"root",
				"root",
				"root",
				level,
				gdriveFolderMarker,
			})
			return root, nil
		}
		root = append(root, GDriveMarker{
			res.Files[0].Parents[0],
			"root",
			"root",
			level,
			gdriveFolderMarker,
		})
		return root, nil
	}
	MergeSolutions := func(solutions_bag []GDriveMarker, solutions_new []GDriveMarker) []GDriveMarker {
		if len(solutions_bag) == 0 {
			return solutions_new
		}

		solutions := make([]GDriveMarker, 0)
		for _, new := range solutions_new {
			for _, old := range solutions_bag {
				if new.id == old.parent && new.level+1 == old.level {
					old.level = new.level
					old.parent = new.id
					solutions = append(solutions, old)
				}
			}
		}
		return solutions
	}
	var FindId func(folders []string, solutions_bag []GDriveMarker) (*GDriveMarker, error)
	FindId = func(folders []string, solutions_bag []GDriveMarker) (*GDriveMarker, error) {
		var solutions_new []GDriveMarker
		var err error
		if len(folders) == 0 {
			solutions_new, err = FindRoot(0)
		} else {
			solutions_new, err = FindSolutions(len(folders), folders[len(folders)-1])
		}

		if err != nil {
			return nil, NewError("Can't get data", 500)
		}
		solutions_bag = MergeSolutions(solutions_bag, solutions_new)
		if len(solutions_bag) == 0 {
			return nil, NewError("Doesn't exist", 404)
		} else if len(solutions_bag) == 1 {
			return &solutions_bag[0], nil
		} else {
			return FindId(folders[:len(folders)-1], solutions_bag)
		}
	}

	path := make([]string, 0)
	for _, chunk := range strings.Split(p, "/") {
		if chunk == "" {
			continue
		}
		path = append(path, chunk)
	}
	if len(path) == 0 {
		return &GDriveMarker{
			"root",
			"",
			"root",
			0,
			gdriveFolderMarker,
		}, nil
	}
	return FindId(path, make([]GDriveMarker, 0))
}

type GDriveMarker struct {
	id     string
	parent string
	name   string
	level  int
	mType  string
}

func getParentPath(path string) string {
	re := regexp.MustCompile("/$")
	path = re.ReplaceAllString(path, "")
	return filepath.Dir(path) + "/"
}
