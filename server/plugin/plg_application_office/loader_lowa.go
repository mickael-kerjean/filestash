package plg_application_office

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Middleware(func(h HandlerFunc) HandlerFunc {
		return func(app *App, res http.ResponseWriter, req *http.Request) {
			head := res.Header()
			head.Set("Cross-Origin-Opener-Policy", "same-origin")
			head.Set("Cross-Origin-Embedder-Policy", "require-corp")
			h(app, res, req)
		}
	})
}
