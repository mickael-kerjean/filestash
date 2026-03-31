package plg_handler_site

import (
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	"golang.org/x/crypto/bcrypt"
)

func cors(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, w http.ResponseWriter, r *http.Request) {
		if allowed := PluginParamCORSAllowOrigins(); allowed != "" {
			w.Header().Add("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
			switch allowed {
			case "*":
				w.Header().Set("Access-Control-Allow-Origin", "*")
			default:
				origin := r.Header.Get("Origin")
				for _, o := range strings.Split(allowed, ",") {
					if strings.TrimSpace(o) == origin {
						w.Header().Set("Access-Control-Allow-Origin", origin)
						break
					}
				}
			}
		}
		fn(ctx, w, r)
	})
}

func basicAdmin(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok || user != "admin" {
			w.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		} else if err := bcrypt.CompareHashAndPassword([]byte(Config.Get("auth.admin").String()), []byte(pass)); err != nil {
			w.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		fn(ctx, w, r)
	})
}
