package plg_handler_site

import (
	"io"
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/ctrl"
	. "github.com/mickael-kerjean/filestash/server/middleware"
	"github.com/mickael-kerjean/filestash/server/model"

	"github.com/gorilla/mux"
)

func init() {
	Hooks.Register.HttpEndpoint(func(r *mux.Router, app *App) error {
		r.PathPrefix("/public/{share}/").HandlerFunc(NewMiddlewareChain(
			publicHandler,
			[]Middleware{SessionStart, SecureHeaders},
			*app,
		)).Methods("GET", "HEAD")
		return nil
	})
}

func publicHandler(app *App, w http.ResponseWriter, r *http.Request) {
	if app.Backend == nil {
		SendErrorResult(w, ErrNotFound)
		return
	} else if model.CanRead(app) == false {
		SendErrorResult(w, ErrPermissionDenied)
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/public/"+app.Share.Id)
	if strings.HasSuffix(path, "/") {
		path += "index.html"
	}
	path, err := ctrl.PathBuilder(app, path)
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Cat(app, path); err != nil {
			SendErrorResult(w, ErrNotAuthorized)
			return
		}
	}
	f, err := app.Backend.Cat(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", GetMimeType(path))
	io.Copy(w, f)
	f.Close()
}
