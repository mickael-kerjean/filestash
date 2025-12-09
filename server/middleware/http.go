package middleware

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	"golang.org/x/time/rate"
)

func ApiHeaders(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", "application/json")
		header.Set("Cache-Control", "no-cache")
		fn(ctx, res, req)
	})
}

func StaticHeaders(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", GetMimeType(filepath.Ext(req.URL.Path)))
		header.Set("Cache-Control", "max-age=2592000")
		fn(ctx, res, req)
	})
}

func PublicCORS(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Access-Control-Allow-Origin", "*")
		header.Set("Access-Control-Allow-Headers", "x-requested-with")
		if req.Method == http.MethodOptions {
			header.Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			res.WriteHeader(http.StatusNoContent)
			return
		}
		fn(ctx, res, req)
	})
}

func IndexHeaders(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", "text/html")
		header.Set("Cache-Control", "no-cache")
		header.Set("Referrer-Policy", "same-origin")
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("X-XSS-Protection", "1; mode=block")
		header.Set("X-Powered-By", fmt.Sprintf("Filestash/%s.%s <https://filestash.app>", APP_VERSION, BUILD_DATE))
		if ori := Config.Get("features.protection.iframe").String(); ori == "" {
			header.Set("X-Frame-Options", "DENY")
		}
		fn(ctx, res, req)
	})
}

func SecureHeaders(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		if Config.Get("general.force_ssl").Bool() {
			header.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("X-XSS-Protection", "1; mode=block")
		fn(ctx, res, req)
	})
}

func SecureOrigin(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if host := Config.Get("general.host").String(); host != "" {
			host = strings.TrimPrefix(host, "http://")
			host = strings.TrimPrefix(host, "https://")
			if req.Host != host && req.Host != fmt.Sprintf("%s:443", host) {
				if strings.HasPrefix(req.URL.Path, "/admin/") == false {
					Log.Error("Request coming from \"%s\" was blocked, only traffic from \"%s\" is allowed. You can change this from the admin console under configure -> host", req.Host, host)
					SendErrorResult(res, ErrNotAllowed)
					return
				} else {
					Log.Warning("Access from incorrect hostname. From the admin console under configure -> host, you need to use the following hostname: '%s' current value is '%s'", req.Host, host)
				}
			}
		}
		if req.Header.Get("X-Requested-With") == "XmlHttpRequest" { // Browser XHR Access
			fn(ctx, res, req)
			return
		} else if Config.Get("features.api.enable").Bool() && len(req.Cookies()) == 0 { // API Access
			fn(ctx, res, req)
			return
		}

		Log.Warning("Intrusion detection: %s - %s", RetrievePublicIp(req), req.URL.String())
		SendErrorResult(res, ErrNotAllowed)
	})
}

var limiter = rate.NewLimiter(10, 1000)

func RateLimiter(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if limiter.Allow() == false {
			Log.Warning("middleware::http::ratelimit too many requests")
			SendErrorResult(
				res,
				NewError(http.StatusText(http.StatusTooManyRequests), http.StatusTooManyRequests),
			)
			return
		}
		fn(ctx, res, req)
	})
}

func RetrievePublicIp(req *http.Request) string {
	if req.Header.Get("X-Forwarded-For") != "" {
		return req.Header.Get("X-Forwarded-For")
	} else {
		return req.RemoteAddr
	}
}
