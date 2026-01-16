package plg_handler_site

import (
	"io"
	"net/http"
	"os"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/ctrl"
	. "github.com/mickael-kerjean/filestash/server/middleware"
	"github.com/mickael-kerjean/filestash/server/model"

	"github.com/gorilla/mux"
)

func init() {
	Hooks.Register.HttpEndpoint(func(r *mux.Router) error {
		if PluginEnable() == false {
			return nil
		}
		r.PathPrefix("/public/{share}/").HandlerFunc(NewMiddlewareChain(
			SiteHandler,
			[]Middleware{SessionStart, SecureHeaders, cors},
		)).Methods("GET", "HEAD")

		r.HandleFunc("/public/", NewMiddlewareChain(
			SharesListHandler,
			[]Middleware{SecureHeaders, basicAdmin},
		)).Methods("GET")
		return nil
	})
}

func SiteHandler(app *App, w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	} else if app.Backend == nil {
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
	if f, err := app.Backend.Cat(path); err == nil {
		w.Header().Set("Content-Type", GetMimeType(path))
		io.Copy(w, f)
		f.Close()
		return
	} else if err == ErrNotFound && PluginParamAutoindex() {
		if files, err := app.Backend.Ls(strings.TrimSuffix(path, "index.html")); err == nil {
			if strings.HasSuffix(r.URL.Path, "/") == false {
				http.Redirect(w, r, r.URL.Path+"/", http.StatusSeeOther)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			if err := TmplAutoindex.Execute(w, map[string]any{
				"Base":  r.URL.Path,
				"Files": files,
			}); err != nil {
				SendErrorResult(w, err)
			}
			return
		}
	}
	SendErrorResult(w, ErrNotFound)
}

func SharesListHandler(app *App, w http.ResponseWriter, r *http.Request) {
	shares, err := model.ShareAll()
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	files := make([]os.FileInfo, len(shares))
	for i, share := range shares {
		t := int64(-1)
		if share.Expire != nil {
			t = *share.Expire
		}
		files[i] = File{
			FName: share.Id,
			FType: "directory",
			FTime: t,
		}
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := TmplAutoindex.Execute(w, map[string]any{
		"Base":  r.URL.Path,
		"Files": files,
	}); err != nil {
		SendErrorResult(w, err)
	}
}
