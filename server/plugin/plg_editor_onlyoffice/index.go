package plg_editor_onlyoffice

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"text/template"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/ctrl"
	"github.com/mickael-kerjean/filestash/server/middleware"
	"github.com/mickael-kerjean/filestash/server/model"

	"github.com/gorilla/mux"
	"github.com/patrickmn/go-cache"
)

var (
	SECRET_KEY_DERIVATE_FOR_ONLYOFFICE string

	onlyoffice_cache *cache.Cache
	plugin_enable    func() bool
	server_url       func() string
	can_chat         func() bool
	can_copy         func() bool
	can_comment      func() bool
	can_download     func() bool
	can_edit         func() bool
	can_print        func() bool
)

type onlyOfficeCacheData struct {
	Path string
	Save func(path string, file io.Reader) error
	Cat  func(path string) (io.ReadCloser, error)
}

func init() {
	SECRET_KEY_DERIVATE_FOR_ONLYOFFICE = Hash("ONLYOFFICE_"+SECRET_KEY, len(SECRET_KEY))
	onlyoffice_cache = cache.New(720*time.Minute, 720*time.Minute)
	plugin_enable = func() bool {
		return Config.Get("features.office.enable").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "enable"
			f.Type = "enable"
			f.Target = []string{"onlyoffice_server", "onlyoffice_can_chat", "onlyoffice_can_copy", "onlyoffice_can_comment", "onlyoffice_can_download", "onlyoffice_can_edit", "onlyoffice_can_print"}
			f.Description = "Enable/Disable the office suite and options to manage word, excel and powerpoint documents."
			f.Default = false
			if u := os.Getenv("ONLYOFFICE_URL"); u != "" {
				f.Default = true
			}
			return f
		}).Bool()
	}

	server_url = func() string {
		return Config.Get("features.office.onlyoffice_server").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "onlyoffice_server"
			f.Name = "onlyoffice_server"
			f.Type = "text"
			f.Description = "Location of your OnlyOffice server"
			f.Default = "http://127.0.0.1:8080"
			f.Placeholder = "Eg: http://127.0.0.1:8080"
			if u := os.Getenv("ONLYOFFICE_URL"); u != "" {
				f.Default = u
				f.Placeholder = fmt.Sprintf("Default: '%s'", u)
			}
			return f
		}).String()
	}

	can_chat = func() bool {
		return Config.Get("features.office.can_chat").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "onlyoffice_can_chat"
			f.Name = "can_chat"
			f.Type = "boolean"
			f.Description = "Enable/Disable chat in onlyoffice"
			f.Default = false
			return f
		}).Bool()
	}

	can_copy = func() bool {
		return Config.Get("features.office.can_copy").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "onlyoffice_can_copy"
			f.Name = "can_copy"
			f.Type = "boolean"
			f.Description = "Enable/Disable copy text in onlyoffice"
			f.Default = false
			return f
		}).Bool()
	}

	can_comment = func() bool {
		return Config.Get("features.office.can_comment").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "onlyoffice_can_comment"
			f.Name = "can_comment"
			f.Type = "boolean"
			f.Description = "Enable/Disable comments in onlyoffice"
			f.Default = false
			return f
		}).Bool()
	}

	can_edit = func() bool {
		return Config.Get("features.office.can_edit").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "onlyoffice_can_edit"
			f.Name = "can_edit"
			f.Type = "boolean"
			f.Description = "Enable/Disable editing in onlyoffice"
			f.Default = true
			return f
		}).Bool()
	}

	can_download = func() bool {
		return Config.Get("features.office.can_download").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "onlyoffice_can_download"
			f.Name = "can_download"
			f.Type = "boolean"
			f.Description = "Display Download button in onlyoffice"
			f.Default = true
			return f
		}).Bool()
	}
	can_print = func() bool {
		return Config.Get("features.office.can_print").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "onlyoffice_can_print"
			f.Name = "can_print"
			f.Type = "boolean"
			f.Description = "Enable/Disable printing in onlyoffice"
			f.Default = false
			return f
		}).Bool()
	}

	Hooks.Register.Onload(func() {
		plugin_enable()
		server_url()
		can_chat()
		can_copy()
		can_comment()
		can_download()
		can_edit()
		can_print()
	})

	Hooks.Register.HttpEndpoint(func(r *mux.Router, app *App) error {
		oods := r.PathPrefix("/onlyoffice").Subrouter()
		oods.PathPrefix("/static/").HandlerFunc(StaticHandler).Methods("GET", "POST")
		oods.HandleFunc("/event", OnlyOfficeEventHandler).Methods("POST")
		oods.HandleFunc("/content", FetchContentHandler).Methods("GET")

		r.HandleFunc(
			COOKIE_PATH+"onlyoffice/iframe",
			middleware.NewMiddlewareChain(
				IframeContentHandler,
				[]Middleware{middleware.SessionStart, middleware.LoggedInOnly},
			),
		).Methods("GET")
		return nil
	})
	Hooks.Register.XDGOpen(`
        if(mime === "application/word" || mime === "application/msword" ||
           mime === "application/vnd.oasis.opendocument.text" || mime === "application/vnd.oasis.opendocument.spreadsheet" ||
           mime === "application/excel" || mime === "application/vnd.ms-excel" || mime === "application/powerpoint" ||
           mime === "application/vnd.ms-powerpoint" || mime === "application/vnd.oasis.opendocument.presentation" ) {
              return ["appframe", {"endpoint": "/api/onlyoffice/iframe"}];
           }
   `)
}

func StaticHandler(res http.ResponseWriter, req *http.Request) {
	if plugin_enable() == false {
		return
	}
	req.URL.Path = strings.TrimPrefix(req.URL.Path, "/onlyoffice/static")
	u, err := url.Parse(server_url())
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	req.Header.Set("X-Forwarded-Host", req.Host+"/onlyoffice/static")
	req.Header.Set("X-Forwarded-Proto", func() string {
		if scheme := req.Header.Get("X-Forwarded-Proto"); scheme != "" {
			return scheme
		} else if req.TLS != nil {
			return "https"
		}
		return "http"
	}())

	// This code is a copy and paste from httputil.NewSingleHostReverseProxy with 1 single change
	// to do SSL termination.
	reverseProxy := &httputil.ReverseProxy{
		Director: func(rq *http.Request) {
			rq.URL.Scheme = "http" // <- this is the only change from NewSingleHostReverseProxy
			rq.URL.Host = u.Host
			rq.URL.Path = func(a, b string) string {
				aslash := strings.HasSuffix(a, "/")
				bslash := strings.HasPrefix(b, "/")
				switch {
				case aslash && bslash:
					return a + b[1:]
				case !aslash && !bslash:
					return a + "/" + b
				}
				return a + b
			}(u.Path, rq.URL.Path)
			if u.RawQuery == "" || rq.URL.RawQuery == "" {
				rq.URL.RawQuery = u.RawQuery + rq.URL.RawQuery
			} else {
				rq.URL.RawQuery = u.RawQuery + "&" + rq.URL.RawQuery
			}
		},
	}
	reverseProxy.ErrorHandler = func(rw http.ResponseWriter, rq *http.Request, err error) {
		Log.Warning("[onlyoffice] %s", err.Error())
		SendErrorResult(rw, NewError(err.Error(), http.StatusBadGateway))
	}
	reverseProxy.ServeHTTP(res, req)
}

func IframeContentHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	if plugin_enable() == false {
		Log.Warning("plg_editor_onlyoffice::handler request_disabled")
		return
	}
	if model.CanRead(ctx) == false {
		SendErrorResult(res, ErrPermissionDenied)
		return
	} else if server_url() == "" {
		res.WriteHeader(http.StatusServiceUnavailable)
		res.Write([]byte("<p>The Onlyoffice server hasn't been configured</p>"))
		res.Write([]byte("<style>p {color: white; text-align: center; margin-top: 50px; font-size: 20px; opacity: 0.6; font-family: monospace; } </style>"))
		return
	}

	var (
		path                    string // path of the file we want to open via onlyoffice
		filestashServerLocation string // location from which the oods server can reach filestash
		userId                  string // as seen by onlyoffice to distinguish different users
		username                string // username as displayed by only office
		key                     string // unique identifier for a file as seen be only office
		contentType             string // name of the application in onlyoffice
		filetype                string // extension of the document
		filename                string // filename of the document
		oodsMode                string // edit mode
		oodsDevice              string // mobile, desktop of embedded
		localip                 string
	)
	query := req.URL.Query()
	path, err := ctrl.PathBuilder(ctx, query.Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	userId = GenerateID(ctx.Session)
	f, err := ctx.Backend.Cat(path)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	key = HashStream(f, 20)
	key = Hash(key+userId+path, 20)

	filename = filepath.Base(path)
	oodsMode = func() string {
		if model.CanEdit(ctx) == false {
			return "view"
		}
		return "edit"
	}()
	oodsDevice = func() string {
		ua := req.Header.Get("User-Agent")
		if ua == "" {
			return "desktop"
		} else if strings.Contains(ua, "iPhone") {
			return "mobile"
		} else if strings.Contains(ua, "iPad") {
			return "mobile"
		} else if strings.Contains(ua, "Android") {
			return "mobile"
		} else if strings.Contains(ua, "Mobile") {
			return "mobile"
		}

		if oodsMode == "view" {
			return "embedded"
		}
		return "desktop"
	}()
	username = func() string {
		if ctx.Session["username"] != "" {
			return ctx.Session["username"]
		}
		return "Me"
	}()
	if ctx.Share.Id != "" {
		username = "Anonymous"
		userId = RandomString(10)
	}
	localip = func() string { // https://stackoverflow.com/questions/23558425/how-do-i-get-the-local-ip-address-in-go#23558495
		addrs, err := net.InterfaceAddrs()
		if err != nil {
			return ""
		}

		maybeips := []string{}
		for _, address := range addrs {
			if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
				if ipnet.IP.To4() != nil {
					maybeips = append(maybeips, ipnet.IP.String())
				}
			}
		}

		// if there is just one interface, we can just pick that one
		if len(maybeips) == 1 {
			return maybeips[0]
		}

		// if not, fallback to capturing our outgoing local ip
		conn, err := net.Dial("udp", "8.8.8.8:80")
		if err != nil {
			return ""
		}
		defer conn.Close()

		localAddr := conn.LocalAddr().(*net.UDPAddr)

		return localAddr.IP.String()
	}()
	filestashServerLocation = fmt.Sprintf(
		"%s://%s:%d",
		func() string { // proto
			if req.TLS == nil {
				return "http"
			}
			return "https"
		}(),
		localip,
		Config.Get("general.port").Int(),
	)
	contentType = func(p string) string {
		var (
			word       string = "text"
			excel      string = "spreadsheet"
			powerpoint string = "presentation"
		)
		switch GetMimeType(p) {
		case "application/word":
			return word
		case "application/msword":
			return word
		case "application/vnd.oasis.opendocument.text":
			return word
		case "application/vnd.oasis.opendocument.spreadsheet":
			return excel
		case "application/excel":
			return excel
		case "application/vnd.ms-excel":
			return excel
		case "application/powerpoint":
			return powerpoint
		case "application/vnd.ms-powerpoint":
			return powerpoint
		case "application/vnd.oasis.opendocument.presentation":
			return powerpoint
		}
		return ""
	}(path)
	filetype = strings.TrimPrefix(filepath.Ext(filename), ".")
	onlyoffice_cache.Set(key, &onlyOfficeCacheData{path, ctx.Backend.Save, ctx.Backend.Cat}, cache.DefaultExpiration)

	tmpl, err := template.New("onlyoffice").Parse(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
   <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <style> body { margin: 0; } body, html{ height: 100%; } iframe { width: 100%; height: 100%; } </style>
    <div id="placeholder"></div>
    <script type="text/javascript" src="/onlyoffice/static/web-apps/apps/api/documents/api.js"></script>
    <script>
      if("DocsAPI" in window) loadApplication();
      else sendError("[error] Can't reach the onlyoffice server");

      function loadApplication() {
          new DocsAPI.DocEditor("placeholder", {
              "token": "{{ .token }}",
              "documentType": "{{ .contentType }}",
              "type": "{{ .device }}",
              "document": {
                  "title": "{{ .filename }}",
                  "url": "{{ .base }}/onlyoffice/content?key={{ .key }}",
                  "fileType": "{{ .filetype }}",
                  "key": "{{ .key }}",
                  "permissions": {
				  	  "chat": {{ .can_chat }},
		 			  "copy": {{ .can_copy }},
					  "comment": {{ .can_comment }},
                      "download": {{ .can_download }},
					  "edit": {{ .can_edit }},
	   				  "print": {{ .can_print }}
                  }
              },
              "editorConfig": {
                  "callbackUrl": "{{ .base }}/onlyoffice/event",
                  "mode": "{{ .mode }}",
                  "customization": {
                      "autosave": false,
                      "forcesave": true,
                      "compactHeader": true
                  },
                  "user": {
                      "id": "{{ .userID }}",
                      "name": "{{ .userName }}"
                  }
              }
          });
      }
      function sendError(message){
          let $el = document.createElement("p");
          $el.innerHTML = message;
          $el.setAttribute("style", "text-align: center; color: white; opacity: 0.8; font-size: 20px; font-family: monospace;");
          document.body.appendChild($el);
      }
    </script>
  </body>
</html>
`)
	if err != nil {
		res.Write([]byte(err.Error()))
		return
	}
	if err := tmpl.Execute(res, map[string]interface{}{
		"base":         filestashServerLocation,
		"can_chat":     can_chat(),
		"can_copy":     can_copy(),
		"can_comment":  can_comment(),
		"can_download": can_download(),
		"can_edit":     can_edit(),
		"can_print":    can_print(),
		"contentType":  contentType,
		"device":       oodsDevice,
		"filename":     filename,
		"filetype":     filetype,
		"key":          key,
		"mode":         oodsMode,
		"token":        "foobar",
		"type":         contentType,
		"userID":       userId,
		"userName":     username,
	}); err != nil {
		res.Write([]byte(err.Error()))
		return
	}
}

func FetchContentHandler(res http.ResponseWriter, req *http.Request) {
	if plugin_enable() == false {
		return
	}
	var key string
	if key = req.URL.Query().Get("key"); key == "" {
		SendErrorResult(res, NewError("unspecified key", http.StatusBadRequest))
		return
	}
	c, found := onlyoffice_cache.Get(key)
	if found == false {
		res.WriteHeader(http.StatusInternalServerError)
		res.Write([]byte(`{"error": 1, "message": "missing data fetcher handler"}`))
		return
	}
	cData, valid := c.(*onlyOfficeCacheData)
	if valid == false {
		res.WriteHeader(http.StatusInternalServerError)
		res.Write([]byte(`{"error": 1, "message": "invalid cache"}`))
		return
	}
	f, err := cData.Cat(cData.Path)
	if err != nil {
		res.WriteHeader(http.StatusNotFound)
		res.Write([]byte(`{"error": 1, "message": "error while fetching data"}`))
		return
	}
	io.Copy(res, f)
	f.Close()
}

type onlyOfficeEventObject struct {
	Actions []struct {
		Type   int    `json: "type"`
		UserId string `json: "userid" `
	} `json: "actions"`
	ChangesURL    string `json: "changesurl"`
	Forcesavetype int    `json: "forcesavetype"`
	History       struct {
		ServerVersion string `json: "serverVersion"`
		Changes       []struct {
			Created string `json: "created"`
			User    struct {
				Id   string `json: "id"`
				Name string `json: "name"`
			}
		} `json: "changes"`
	} `json: "history"`
	Key      string   `json: "key"`
	Status   int      `json: "status"`
	Url      string   `json: "url"`
	UserData string   `json: "userdata"`
	Lastsave string   `json: "lastsave"`
	Users    []string `json: "users"`
}

func OnlyOfficeEventHandler(res http.ResponseWriter, req *http.Request) {
	if plugin_enable() == false {
		return
	}
	event := onlyOfficeEventObject{}
	if err := json.NewDecoder(req.Body).Decode(&event); err != nil {
		SendErrorResult(res, err)
		return
	}
	req.Body.Close()

	switch event.Status {
	case 0:
		Log.Warning("[onlyoffice] no document with the key identifier could be found. %+v", event)
	case 1:
		// document is being edited
	case 2:
		// document is ready for saving
	case 3:
		// document saving error has occurred
		Log.Warning("[onlyoffice] document saving error has occurred. %+v", event)
	case 4:
		// document is closed with no changes
	case 5:
		Log.Warning("[onlyoffice] undocumented status. %+v", event)
	case 6: // document is being edited, but the current document state is saved
		saveObject, found := onlyoffice_cache.Get(event.Key)
		if found == false {
			res.WriteHeader(http.StatusInternalServerError)
			res.Write([]byte(`{"error": 1, "message": "doens't know where to store the given data"}`))
			return
		}
		cData, valid := saveObject.(*onlyOfficeCacheData)
		if valid == false {
			res.WriteHeader(http.StatusInternalServerError)
			res.Write([]byte(`{"error": 1, "message": "[internal error] invalid save handler"}`))
			return
		}

		r, err := http.NewRequest("GET", event.Url, nil)
		if err != nil {
			res.WriteHeader(http.StatusInternalServerError)
			res.Write([]byte(`{"error": 1, "message": "couldn't fetch the document on the oods server"}`))
			return
		}
		f, err := HTTPClient.Do(r)
		if err = cData.Save(cData.Path, f.Body); err != nil {
			res.WriteHeader(http.StatusInternalServerError)
			res.Write([]byte(`{"error": 1, "message": "error while saving the document"}`))
			return
		}
		f.Body.Close()
	case 7:
		Log.Warning("[onlyoffice] error has occurred while force saving the document. %+v", event)
	default:
		Log.Warning("[onlyoffice] undocumented status. %+v", event)
	}
	res.Write([]byte(`{"error": 0}`))
}
