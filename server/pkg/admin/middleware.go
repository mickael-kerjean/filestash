package admin

import (
	"net/http"
	"encoding/json"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
)

func AdminOnly(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if setupWizard := Config.Get("auth.admin").String() == ""; !setupWizard {
			authStr := strings.TrimPrefix(req.Header.Get("Authorization"), "Bearer ")
			if authStr == "" {
				c, err := req.Cookie(COOKIE_NAME_ADMIN)
				if err != nil {
					SendErrorResult(res, ErrPermissionDenied)
					return
				}
				authStr = c.Value
			}
			str, err := DecryptString(SECRET_KEY_DERIVATE_FOR_ADMIN, authStr)
			if err != nil {
				SendErrorResult(res, ErrPermissionDenied)
				return
			}
			token := AdminToken{}
			json.Unmarshal([]byte(str), &token)

			if token.IsValid() == false || token.IsAdmin() == false {
				SendErrorResult(res, ErrPermissionDenied)
				return
			}
		}
		fn(ctx, res, req)
	})
}
