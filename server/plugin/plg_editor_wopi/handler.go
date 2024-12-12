package plg_editor_wopi

import (
	"encoding/base64"
	"encoding/json"
	"encoding/xml"
	"io"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"text/template"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/ctrl"
	"github.com/mickael-kerjean/filestash/server/middleware"
	"github.com/mickael-kerjean/filestash/server/model"

	"github.com/gorilla/mux"
)

var WOPIRoutes = func(r *mux.Router, app *App) error {
	r.HandleFunc(
		"/api/wopi/iframe",
		middleware.NewMiddlewareChain(
			IframeContentHandler,
			[]Middleware{middleware.SessionStart, middleware.LoggedInOnly},
			*app,
		),
	).Methods("GET")
	r.HandleFunc("/api/wopi/files/{path64}", WOPIHandler_CheckFileInfo).Methods("GET")
	r.HandleFunc("/api/wopi/files/{path64}/contents", WOPIHandler_GetFile).Methods("GET")
	r.HandleFunc("/api/wopi/files/{path64}/contents", WOPIHandler_PutFile).Methods("POST")
	return nil
}

var WOPIOverrides = `
    if(mime === "application/word" || mime === "application/msword" ||
        mime === "application/vnd.oasis.opendocument.text" || mime === "application/vnd.oasis.opendocument.spreadsheet" ||
        mime === "application/excel" || mime === "application/vnd.ms-excel" || mime === "application/powerpoint" ||
        mime === "application/vnd.ms-powerpoint" || mime === "application/vnd.oasis.opendocument.presentation" ) {
        return ["appframe", {"endpoint": "/api/wopi/iframe"}];
    }
`

func WOPIHandler_CheckFileInfo(w http.ResponseWriter, r *http.Request) {
	if plugin_enable() == false {
		SendErrorResult(w, ErrNotFound)
		return
	}
	WOPIExecute(w, r)(func(ctx *App, fullpath string, w http.ResponseWriter) {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]any{
			"BaseFileName":     filepath.Base(fullpath),
			"UserFriendlyName": "Unknown",
			"UserCanWrite":     model.CanEdit(ctx),
			"IsAdminUser":      false,
			"IsAnonymousUser":  true,
		}); err != nil {
			SendErrorResult(w, err)
			return
		}
	})
}

func WOPIHandler_GetFile(w http.ResponseWriter, r *http.Request) {
	WOPIExecute(w, r)(func(ctx *App, fullpath string, w http.ResponseWriter) {
		f, err := ctx.Backend.Cat(fullpath)
		if err != nil {
			SendErrorResult(w, err)
			return
		}
		io.Copy(w, f)
	})
}

func WOPIHandler_PutFile(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	WOPIExecute(w, r)(func(ctx *App, fullpath string, w http.ResponseWriter) {
		err := ctx.Backend.Save(fullpath, r.Body)
		if err != nil {
			SendErrorResult(w, err)
			return
		}
		SendSuccessResult(w, nil)
	})
}

func WOPIExecute(w http.ResponseWriter, r *http.Request) func(func(*App, string, http.ResponseWriter)) {
	return func(fn func(*App, string, http.ResponseWriter)) {
		path64 := mux.Vars(r)["path64"]
		p, err := base64.StdEncoding.DecodeString(path64)
		if err != nil {
			SendErrorResult(w, ErrNotValid)
			return
		}
		middleware.NewMiddlewareChain(
			func(ctx *App, w http.ResponseWriter, r *http.Request) {
				fullpath, err := ctrl.PathBuilder(ctx, string(p))
				if err != nil {
					SendErrorResult(w, err)
					return
				}
				fn(ctx, fullpath, w)
			},
			[]Middleware{middleware.SessionStart},
			App{},
		).ServeHTTP(w, r)
	}
}

func IframeContentHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	u, err := wopiDiscovery(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Warning("plg_editor_wopi::discovery err=%s", err.Error())
		SendErrorResult(res, ErrNotValid)
		return
	}
	tmpl, err := template.New("wopi").Parse(`<!DOCTYPE html>
<html lang="en">
  <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>iframe.hidden{ opacity: 0; } iframe{ opacity: 1; transition: opacity 0.5s ease; transition-delay: 1s; }</style>
  </head>
  <body>
    <style> body { margin: 0; } body, html{ height: 100%; } iframe { width: 100%; height: 100%; background: white; } </style>
    <iframe frameborder="0" src="{{ .server }}" class="hidden"></iframe>
    <script>
        const $iframe = document.querySelector("iframe");
        window.post = (data) => $iframe.contentWindow.postMessage(JSON.stringify(data), "*");
        window.addEventListener("message", (event) => {
            let msg = JSON.parse(event.data);
            if (!msg) return;
            if (msg.MessageId === "App_LoadingStatus" && msg.Values.Status === "Initialized") {
                requestAnimationFrame(() => $iframe.classList.remove("hidden"));
                post({ MessageId: "Host_PostmessageReady" });
            }
            console.log("MESSAGE WINDOW", msg); // TODO: loader handling
        });
    </script>
  </body>
</html>
`)
	if err != nil {
		res.Write([]byte(err.Error()))
		return
	}
	if err := tmpl.Execute(res, map[string]interface{}{
		"server": u,
	}); err != nil {
		res.Write([]byte(err.Error()))
		return
	}
}

type WOPIDiscovery struct {
	XMLName  xml.Name      `xml:"wopi-discovery"`
	NetZones []WOPINetZone `xml:"net-zone"`
}

type WOPINetZone struct {
	Apps []WOPIApp `xml:"app"`
}

type WOPIApp struct {
	Name    string       `xml:"name,attr"`
	Actions []WOPIAction `xml:"action"`
}

type WOPIAction struct {
	Ext    string `xml:"ext,attr"`
	URLSrc string `xml:"urlsrc,attr"`
}

func wopiDiscovery(ctx *App, fullpath string) (string, error) {
	// STEP1: fetch discovery
	resp, err := http.Get(server_url() + "/hosting/discovery")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", ErrInternal
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// STEP2: parse discovery
	var discovery WOPIDiscovery
	if err := xml.Unmarshal(body, &discovery); err != nil {
		return "", err
	}

	// STEP3: find the right URLsrc for the desired filetype
	var urlsrc = ""
	fileType := strings.TrimPrefix(filepath.Ext(fullpath), ".")
	for _, netZone := range discovery.NetZones {
		for _, app := range netZone.Apps {
			for _, action := range app.Actions {
				if action.Ext == fileType {
					urlsrc = action.URLSrc
				}
			}
		}
	}
	if urlsrc == "" {
		return "", ErrNotFound
	}

	// STEP4: build the iframe URL
	u, err := url.Parse(urlsrc)
	if err != nil {
		return "", err
	}
	myURL := origin()
	if myURL == "" {
		myURL := "http://"
		if Config.Get("general.force_ssl").Bool() {
			myURL = "https://"
		}
		myURL += Config.Get("general.host").String()
	}
	p := u.Query()
	p.Set("WOPISrc", myURL+"/api/wopi/files/"+base64.StdEncoding.EncodeToString([]byte(fullpath)))
	p.Set("access_token", ctx.Authorization)
	u.RawQuery = p.Encode()
	if newHost := rewrite_url(); newHost != "" {
		if p, err := url.Parse(newHost); err == nil {
			u.Host = p.Host
			u.Scheme = p.Scheme
		}
	}
	return u.String(), nil
}
