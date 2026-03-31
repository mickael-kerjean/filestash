package plg_widget_chat

import (
	_ "embed"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/gorilla/mux"
)

//go:embed assets/pgp.js
var CTRLJS []byte

//go:embed assets/pgp.diff
var PATCH []byte

func init() {
	Hooks.Register.HttpEndpoint(func(r *mux.Router) error {
		r.HandleFunc(WithBase("/plg_widget_pgp/pgp.js"), func(res http.ResponseWriter, req *http.Request) {
			http.Redirect(res, req, WithBase("/assets/"+BUILD_REF+"/pages/viewerpage/pgp.js"), http.StatusSeeOther)
		})
		r.HandleFunc(WithBase("/assets/"+BUILD_REF+"/pages/viewerpage/pgp.js"), func(res http.ResponseWriter, req *http.Request) {
			res.Header().Set("Content-Type", "application/javascript")
			res.Write(CTRLJS)
		}).Methods("GET")
		return nil
	})
	Hooks.Register.StaticPatch(PATCH)
}
