package middleware

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
	"path/filepath"
)

func ApiHeaders(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", "application/json")
		header.Set("Cache-Control", "no-cache")
		fn(ctx, res, req)
	}
}

func StaticHeaders(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", GetMimeType(filepath.Ext(req.URL.Path)))
		header.Set("Cache-Control", "max-age=2592000")
		fn(ctx, res, req)
	}
}

func IndexHeaders(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", "text/html")
		header.Set("Cache-Control", "no-cache")
		header.Set("Referrer-Policy", "same-origin")
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("X-XSS-Protection", "1; mode=block")
		header.Set("X-Powered-By", fmt.Sprintf("Filestash/%s.%s <https://filestash.app>", APP_VERSION, BUILD_DATE))

		cspHeader := "default-src 'none'; "
		cspHeader += "style-src 'self' 'unsafe-inline'; "
		cspHeader += "font-src 'self' data:; "
		cspHeader += "manifest-src 'self'; "
		cspHeader += "script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; "
		cspHeader += "img-src 'self' blob: data: https://maps.wikimedia.org; "
		cspHeader += "connect-src * data: blob: 'unsafe-inline';  "
		cspHeader += "object-src 'self'; "
		cspHeader += "media-src 'self' blob:; "
		cspHeader += "worker-src 'self' blob:; "
		cspHeader += "form-action 'self'; base-uri 'self'; "
		cspHeader += "frame-src 'self'; "
		if ori := Config.Get("features.protection.iframe").String(); ori == "" {
			cspHeader += "frame-ancestors 'none';"
			header.Set("X-Frame-Options", "DENY")
		} else {
			cspHeader += fmt.Sprintf("frame-ancestors %s;", ori)
		}
		header.Set("Content-Security-Policy", cspHeader)
		fn(ctx, res, req)
	}
}

func SecureHeaders(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if host := Config.Get("general.host").String(); host != "" {
			if req.Host != host && req.Host != fmt.Sprintf("%s:443", host) {
				Log.Error("Request coming from \"%s\" was blocked, only traffic from \"%s\" is allowed. You can change this from the admin console under configure -> host", req.Host, host)
				SendErrorResult(res, ErrNotAllowed)
				return
			}
		}
		header := res.Header()
		if Config.Get("general.force_ssl").Bool() {
			header.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("X-XSS-Protection", "1; mode=block")
		fn(ctx, res, req)
	}
}

func SecureAjax(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if req.Header.Get("X-Requested-With") != "XmlHttpRequest" {
			Log.Warning("Intrusion detection: %s - %s", req.RemoteAddr, req.URL.String())
			SendErrorResult(res, ErrNotAllowed)
			return
		}
		fn(ctx, res, req)
	}
}
