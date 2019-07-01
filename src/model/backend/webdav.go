package backend

import (
	"encoding/xml"
	. "github.com/mickael-kerjean/filestash/src/common"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type WebDav struct {
	params *WebDavParams
}

type WebDavParams struct {
	url      string
	username string
	password string
	path     string
}

func init() {
	Backend.Register("webdav", WebDav{})
}

func (w WebDav) Init(params map[string]string, app *App) (IBackend, error) {
	params["url"] = regexp.MustCompile(`\/$`).ReplaceAllString(params["url"], "")
	backend := WebDav{
		params: &WebDavParams{
			params["url"],
			params["username"],
			params["password"],
			params["path"],
		},
	}
	return backend, nil
}

func (w WebDav) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:        "type",
				Type:        "hidden",
				Value:       "webdav",
			},
			FormElement{
				Name:        "url",
				Type:        "text",
				Placeholder: "Address*",
			},
			FormElement{
				Name:        "username",
				Type:        "text",
				Placeholder: "Username",
			},
			FormElement{
				Name:        "password",
				Type:        "password",
				Placeholder: "Password",
			},
			FormElement{
				Name:        "advanced",
				Type:        "enable",
				Placeholder: "Advanced",
				Target:      []string{"webdav_path"},
			},
			FormElement{
				Id:          "webdav_path",
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
		},
	}
}

func (w WebDav) Ls(path string) ([]os.FileInfo, error) {
	files := make([]os.FileInfo, 0)
	query := `<d:propfind xmlns:d='DAV:'>
			<d:prop>
				<d:displayname/>
				<d:resourcetype/>
				<d:getlastmodified/>
				<d:getcontentlength/>
			</d:prop>
		</d:propfind>`
	res, err := w.request("PROPFIND", w.params.url+encodeURL(path), strings.NewReader(query), func(req *http.Request) {
		req.Header.Add("Depth", "1")
	})
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		return nil, NewError(HTTPFriendlyStatus(res.StatusCode)+": can't get things in "+filepath.Base(path), res.StatusCode)
	}

	var r WebDavResp
	decoder := xml.NewDecoder(res.Body)
	decoder.Decode(&r)
	if len(r.Responses) == 0 {
		return nil, NewError("Server not found", 404)
	}

	LongURLDav := w.params.url+encodeURL(path)
	ShortURLDav := regexp.MustCompile(`^http[s]?://[^/]*`).ReplaceAllString(LongURLDav, "")
	for _, tag := range r.Responses {
		if tag.Href == ShortURLDav || tag.Href  == LongURLDav {
			continue
		}

		for i, prop := range tag.Props {
			if i > 0 {
				break
			}
			files = append(files, File{
				FName: func(p string) string {
					name := filepath.Base(p)
					name = decodeURL(name)
					return name
				}(tag.Href),
				FType: func(p string) string {
					if p == "collection" {
						return "directory"
					}
					return "file"
				}(prop.Type.Local),
				FTime: func() int64 {
					t, err := time.Parse(time.RFC1123, prop.Modified)
					if err != nil {
						return 0
					}
					return t.Unix()
				}(),
				FSize: int64(prop.Size),
			})
		}
	}
	return files, nil
}

func (w WebDav) Cat(path string) (io.ReadCloser, error) {
	res, err := w.request("GET", w.params.url+encodeURL(path), nil, nil)
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 400 {
		return nil, NewError(HTTPFriendlyStatus(res.StatusCode)+": can't create "+filepath.Base(path), res.StatusCode)
	}
	return res.Body, nil
}
func (w WebDav) Mkdir(path string) error {
	res, err := w.request("MKCOL", w.params.url+encodeURL(path), nil, func(req *http.Request) {
		req.Header.Add("Overwrite", "F")
	})
	if err != nil {
		return err
	}
	res.Body.Close()
	if res.StatusCode >= 400 {
		return NewError(HTTPFriendlyStatus(res.StatusCode)+": can't create "+filepath.Base(path), res.StatusCode)
	}
	return nil
}
func (w WebDav) Rm(path string) error {
	res, err := w.request("DELETE", w.params.url+encodeURL(path), nil, nil)
	if err != nil {
		return err
	}
	res.Body.Close()
	if res.StatusCode >= 400 {
		return NewError(HTTPFriendlyStatus(res.StatusCode)+": can't remove "+filepath.Base(path), res.StatusCode)
	}
	return nil
}
func (w WebDav) Mv(from string, to string) error {
	res, err := w.request("MOVE", w.params.url+encodeURL(from), nil, func(req *http.Request) {
		req.Header.Add("Destination", w.params.url+encodeURL(to))
		req.Header.Add("Overwrite", "T")
	})
	if err != nil {
		return err
	}
	res.Body.Close()
	if res.StatusCode >= 400 {
		return NewError(HTTPFriendlyStatus(res.StatusCode)+": can't do that", res.StatusCode)
	}
	return nil
}
func (w WebDav) Touch(path string) error {
	return w.Save(path, strings.NewReader(""))
}
func (w WebDav) Save(path string, file io.Reader) error {
	res, err := w.request("PUT", w.params.url+encodeURL(path), file, nil)
	if err != nil {
		return err
	}
	res.Body.Close()
	if res.StatusCode >= 400 {
		return NewError(HTTPFriendlyStatus(res.StatusCode)+": can't do that", res.StatusCode)
	}
	return nil
}

func (w WebDav) request(method string, url string, body io.Reader, fn func(req *http.Request)) (*http.Response, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	if w.params.username != "" {
		req.SetBasicAuth(w.params.username, w.params.password)
	}
	req.Header.Add("Content-Type", "text/xml;charset=UTF-8")
	req.Header.Add("Accept", "application/xml,text/xml")
	req.Header.Add("Accept-Charset", "utf-8")

	if req.Body != nil {
		defer req.Body.Close()
	}
	if fn != nil {
		fn(req)
	}
	return HTTPClient.Do(req)
}

type WebDavResp struct {
	Responses []struct {
		Href  string `xml:"href"`
		Props []struct {
			Name     string   `xml:"prop>displayname,omitempty"`
			Type     xml.Name `xml:"prop>resourcetype>collection,omitempty"`
			Size     int64    `xml:"prop>getcontentlength,omitempty"`
			Modified string   `xml:"prop>getlastmodified,omitempty"`
		} `xml:"propstat"`
	} `xml:"response"`
}

func encodeURL(path string) string {
	p := url.PathEscape(path)
	return strings.Replace(p, "%2F", "/", -1)
}

func decodeURL(path string) string {
	str, err := url.PathUnescape(path)
	if err != nil {
		return path
	}
	return str
}
