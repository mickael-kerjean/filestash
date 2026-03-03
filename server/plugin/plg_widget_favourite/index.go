package plg_widget_favourite

import (
	_ "embed"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/gorilla/mux"
)

//go:embed assets/favourite.diff
var PATCH []byte

//go:embed assets/sidebar_favourite.js
var JS []byte

func init() {
	Hooks.Register.HttpEndpoint(func(r *mux.Router) error {
		r.HandleFunc(WithBase("/assets/"+BUILD_REF+"/components/sidebar_favourite.js"), func(res http.ResponseWriter, req *http.Request) {
			res.Header().Set("Content-Type", "application/javascript")
			res.Write(JS)
		}).Methods("GET")
		return nil
	})
	Hooks.Register.OnConfig(func() {
		if PluginEnable() {
			Hooks.Register.StaticPatch(PATCH, WithID("plg_widget_favourite"))
		} else {
			Hooks.Register.StaticPatch([]byte(""), WithID("plg_widget_favourite"))
		}
	})
}
