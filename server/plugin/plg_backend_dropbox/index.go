package plg_backend_dropbox

import (
	"encoding/json"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

func init() {
	Backend.Register("dropbox", Dropbox{})
}

type Dropbox struct {
	ClientId string
	Hostname string
	Bearer   string
}

func (d Dropbox) Init(params map[string]string, app *App) (IBackend, error) {
	backend := &Dropbox{}
	if env := os.Getenv("DROPBOX_CLIENT_ID"); env != "" {
		backend.ClientId = env
	} else {
		backend.ClientId = Config.Get("auth.dropbox.client_id").Default("").String()
	}
	backend.Hostname = Config.Get("general.host").String()
	backend.Bearer = params["access_token"]

	if backend.ClientId == "" {
		return backend, NewError("Missing ClientID: Contact your admin", 502)
	} else if backend.Hostname == "" {
		return backend, NewError("Missing Hostname: Contact your admin", 502)
	}
	return backend, nil
}

func (d Dropbox) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:  "type",
				Type:  "hidden",
				Value: "dropbox",
			},
			FormElement{
				ReadOnly: true,
				Name:     "oauth2",
				Type:     "text",
				Value:    "/api/session/auth/dropbox",
			},
			FormElement{
				ReadOnly: true,
				Name:     "image",
				Type:     "image",
				Value:    "data:image/svg+xml;utf8;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNDIuNCAzOS41IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4KICA8cG9seWdvbiBmaWxsPSIjMDA3RUU1IiBwb2ludHM9IjEyLjUsMCAwLDguMSA4LjcsMTUuMSAyMS4yLDcuMyIvPgo8cG9seWdvbiBmaWxsPSIjMDA3RUU1IiBwb2ludHM9IjAsMjEuOSAxMi41LDMwLjEgMjEuMiwyMi44IDguNywxNS4xIi8+Cjxwb2x5Z29uIGZpbGw9IiMwMDdFRTUiIHBvaW50cz0iMjEuMiwyMi44IDMwLDMwLjEgNDIuNCwyMiAzMy44LDE1LjEiLz4KPHBvbHlnb24gZmlsbD0iIzAwN0VFNSIgcG9pbnRzPSI0Mi40LDguMSAzMCwwIDIxLjIsNy4zIDMzLjgsMTUuMSIvPgo8cG9seWdvbiBmaWxsPSIjMDA3RUU1IiBwb2ludHM9IjIxLjMsMjQuNCAxMi41LDMxLjcgOC44LDI5LjIgOC44LDMyIDIxLjMsMzkuNSAzMy44LDMyIDMzLjgsMjkuMiAzMCwzMS43Ii8+Cjwvc3ZnPgo=",
			},
		},
	}
}

func (d Dropbox) OAuthURL() string {
	url := "https://www.dropbox.com/oauth2/authorize?"
	url += "client_id=" + d.ClientId
	url += "&redirect_uri=https://" + d.Hostname + "/login"
	url += "&response_type=token"
	return url
}

func (d Dropbox) Ls(path string) ([]os.FileInfo, error) {
	files := make([]os.FileInfo, 0)

	args := struct {
		Path             string `json:"path"`
		Recursive        bool   `json:"recursive"`
		IncludeDeleted   bool   `json:"include_deleted"`
		IncludeMediaInfo bool   `json:"include_media_info"`
	}{d.path(path), false, false, true}
	res, err := d.request("POST", "https://api.dropboxapi.com/2/files/list_folder", d.toReader(args), nil)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		return nil, NewError(HTTPFriendlyStatus(res.StatusCode)+": can't get things in"+filepath.Base(path), res.StatusCode)
	}

	var r struct {
		Files []struct {
			Type string    `json:".tag"`
			Name string    `json:"name"`
			Time time.Time `json:"client_modified"`
			Size uint      `json:"size"`
		} `json:"entries"`
	}
	decoder := json.NewDecoder(res.Body)
	decoder.Decode(&r)

	for _, obj := range r.Files {
		files = append(files, File{
			FName: obj.Name,
			FType: func(p string) string {
				if p == "folder" {
					return "directory"
				}
				return "file"
			}(obj.Type),
			FTime: obj.Time.UnixNano() / 1000,
			FSize: int64(obj.Size),
		})
	}
	return files, nil
}

func (d Dropbox) Stat(path string) (os.FileInfo, error) {
	return nil, ErrNotImplemented
}

func (d Dropbox) Cat(path string) (io.ReadCloser, error) {
	res, err := d.request("POST", "https://content.dropboxapi.com/2/files/download", nil, func(req *http.Request) {
		arg := struct {
			Path string `json:"path"`
		}{d.path(path)}
		json, _ := io.ReadAll(d.toReader(arg))
		req.Header.Set("Dropbox-API-Arg", string(json))
	})
	if err != nil {
		return nil, err
	}
	return res.Body, nil
}

func (d Dropbox) Mkdir(path string) error {
	args := struct {
		Path       string `json:"path"`
		Autorename bool   `json:"autorename"`
	}{d.path(path), false}
	res, err := d.request("POST", "https://api.dropboxapi.com/2/files/create_folder_v2", d.toReader(args), nil)
	if err != nil {
		return err
	}
	res.Body.Close()
	if res.StatusCode >= 400 {
		return NewError(HTTPFriendlyStatus(res.StatusCode)+": can't create "+filepath.Base(path), res.StatusCode)
	}
	return nil
}

func (d Dropbox) Rm(path string) error {
	args := struct {
		Path string `json:"path"`
	}{d.path(path)}
	res, err := d.request("POST", "https://api.dropboxapi.com/2/files/delete_v2", d.toReader(args), nil)
	if res.StatusCode >= 400 {
		return NewError(HTTPFriendlyStatus(res.StatusCode)+": can't remove "+filepath.Base(path), res.StatusCode)
	}
	res.Body.Close()
	return err
}

func (d Dropbox) Mv(from string, to string) error {
	args := struct {
		FromPath string `json:"from_path"`
		ToPath   string `json:"to_path"`
	}{d.path(from), d.path(to)}
	res, err := d.request("POST", "https://api.dropboxapi.com/2/files/move_v2", d.toReader(args), nil)
	if res.StatusCode >= 400 {
		return NewError(HTTPFriendlyStatus(res.StatusCode)+": can't do that", res.StatusCode)
	}
	res.Body.Close()
	return err
}

func (d Dropbox) Touch(path string) error {
	return d.Save(path, strings.NewReader(""))
}

func (d Dropbox) Save(path string, file io.Reader) error {
	res, err := d.request("POST", "https://content.dropboxapi.com/2/files/upload", file, func(req *http.Request) {
		arg := struct {
			Path       string `json:"path"`
			AutoRename bool   `json:"autorename"`
			Mode       string `json:"mode"`
		}{d.path(path), false, "overwrite"}
		json, _ := io.ReadAll(d.toReader(arg))
		req.Header.Set("Dropbox-API-Arg", string(json))
		req.Header.Set("Content-Type", "application/octet-stream")
	})
	if err != nil {
		return err
	}
	res.Body.Close()
	if res.StatusCode >= 400 {
		return NewError(HTTPFriendlyStatus(res.StatusCode)+": can't do that", res.StatusCode)
	}
	return err
}

func (d Dropbox) request(method string, url string, body io.Reader, fn func(*http.Request)) (*http.Response, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+d.Bearer)
	if fn == nil {
		req.Header.Set("Content-Type", "application/json")
	} else {
		fn(req)
	}
	if req.Body != nil {
		defer req.Body.Close()
	}
	return HTTPClient.Do(req)
}

func (d Dropbox) toReader(a interface{}) io.Reader {
	j, err := json.Marshal(a)
	if err != nil {
		return nil
	}
	return strings.NewReader(string(j))
}

func (d Dropbox) path(path string) string {
	return regexp.MustCompile(`\/$`).ReplaceAllString(path, "")
}
