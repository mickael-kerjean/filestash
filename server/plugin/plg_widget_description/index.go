package plg_widget_description

import (
	_ "embed"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/middleware"

	"github.com/gorilla/mux"
)

//go:embed assets/sidebar_description.js
var CTRLJS []byte

//go:embed assets/sidebar.diff
var PATCH []byte

func init() {
	Hooks.Register.HttpEndpoint(func(r *mux.Router) error {
		r.HandleFunc("/api/plg_widget_description/description", NewMiddlewareChain(get, []Middleware{ApiHeaders, SecureHeaders, PluginGuard, SessionStart})).Methods("GET")
		r.HandleFunc("/api/plg_widget_description/description", NewMiddlewareChain(update, []Middleware{ApiHeaders, SecureHeaders, PluginGuard, SessionStart, BodyParser})).Methods("PUT")

		r.HandleFunc(WithBase("/plg_widget_description/sidebar_description.js"), func(res http.ResponseWriter, req *http.Request) {
			http.Redirect(res, req, WithBase("/assets/"+BUILD_REF+"/components/sidebar_description.js"), http.StatusSeeOther)
		})
		r.HandleFunc(WithBase("/assets/"+BUILD_REF+"/components/sidebar_description.js"), func(res http.ResponseWriter, req *http.Request) {
			res.Header().Set("Content-Type", "application/javascript")
			res.Write(CTRLJS)
		}).Methods("GET")
		return nil
	})

	Hooks.Register.OnConfig(func() {
		if PluginEnable() {
			Hooks.Register.StaticPatch(PATCH, WithID("plg_widget_description"))
		} else {
			Hooks.Register.StaticPatch([]byte(""), WithID("plg_widget_description"))
		}
	})
}

func PluginGuard(fn HandlerFunc) HandlerFunc {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if !PluginEnable() {
			SendErrorResult(res, ErrNotAllowed)
			return
		}
		fn(ctx, res, req)
	}
}
