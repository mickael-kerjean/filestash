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
		r.HandleFunc("/api/description", NewMiddlewareChain(get, []Middleware{ApiHeaders, SecureHeaders, SessionStart})).Methods("GET")
		r.HandleFunc("/api/description", NewMiddlewareChain(update, []Middleware{ApiHeaders, SecureHeaders, SessionStart, BodyParser})).Methods("PUT")

		r.HandleFunc(WithBase("/plg_widget_description/sidebar_description.js"), func(res http.ResponseWriter, req *http.Request) {
			http.Redirect(res, req, WithBase("/assets/"+BUILD_REF+"/components/sidebar_description.js"), http.StatusSeeOther)
		})
		r.HandleFunc(WithBase("/assets/"+BUILD_REF+"/components/sidebar_description.js"), func(res http.ResponseWriter, req *http.Request) {
			res.Header().Set("Content-Type", "application/javascript")
			res.Write(CTRLJS)
		}).Methods("GET")
		return nil
	})

	Hooks.Register.StaticPatch(PATCH)
}
