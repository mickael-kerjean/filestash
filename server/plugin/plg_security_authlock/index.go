package plg_security_authlock

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Middleware(func(next HandlerFunc) HandlerFunc {
		return func(app *App, res http.ResponseWriter, req *http.Request) {
			if req.Method == http.MethodPost && req.URL.Path == WithBase("/api/session") && PluginEnable() {
				SendErrorResult(res, ErrNotFound)
				return
			}
			next(app, res, req)
		}
	})
}
