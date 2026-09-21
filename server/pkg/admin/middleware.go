package admin

import (
	"encoding/json"
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func AdminOnly(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if setupWizard := Config.Get("auth.admin").String() == ""; !setupWizard {
			authStr := strings.TrimPrefix(req.Header.Get("Authorization"), "Bearer ")
			if authStr == "" {
				c, err := req.Cookie(COOKIE_NAME_ADMIN)
				if err != nil {
					sendAdminError(res, req, ErrPermissionDenied)
					return
				}
				authStr = c.Value
			}
			str, err := DecryptString(SECRET_KEY_DERIVATE_FOR_ADMIN, authStr)
			if err != nil {
				sendAdminError(res, req, ErrPermissionDenied)
				return
			}
			token := AdminToken{}
			json.Unmarshal([]byte(str), &token)

			if token.IsValid() == false || token.IsAdmin() == false {
				sendAdminError(res, req, ErrPermissionDenied)
				return
			}
		}
		fn(ctx, res, req)
	})
}

func sendAdminError(res http.ResponseWriter, req *http.Request, err error) {
	if strings.Contains(req.Header.Get("Accept"), "text/html") {
		http.Redirect(res, req, WithBase("/admin/")+"?next="+req.URL.String(), http.StatusFound)
		return
	}
	SendErrorResult(res, err)
}
