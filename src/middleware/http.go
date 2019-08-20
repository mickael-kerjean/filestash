package middleware

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/src/common"
	"net/http"
	"path/filepath"
)

func ApiHeaders(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", "application/json")
		header.Set("Cache-Control", "no-cache")
		fn(ctx, res, req)
	}
}

func SecureAjax(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		if req.Header.Get("X-Requested-With") != "XmlHttpRequest" {
			Log.Warning("Intrusion detection: %s - %s", req.RemoteAddr, req.URL.String())
			SendErrorResult(res, ErrNotAllowed)
			return
		}
		fn(ctx, res, req)
	}
}

func StaticHeaders(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", GetMimeType(filepath.Ext(req.URL.Path)))
		header.Set("Cache-Control", "max-age=2592000")
		fn(ctx, res, req)
	}
}

func IndexHeaders(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", "text/html")
		header.Set("Cache-Control", "no-cache")
		header.Set("Referrer-Policy", "same-origin")
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("X-XSS-Protection", "1; mode=block")
		header.Set("X-Frame-Options", "DENY")
		header.Set("X-Powered-By", fmt.Sprintf("Filestash/%s.%s <https://filestash.app>", APP_VERSION, BUILD_DATE))
		header.Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; font-src 'self' data:; manifest-src 'self'; script-src 'self' 'sha256-JNAde5CZQqXtYRLUk8CGgyJXo6C7Zs1lXPPClLM1YM4=' 'sha256-9/gQeQaAmVkFStl6tfCbHXn8mr6PgtxlH+hEp685lzY='; img-src 'self' data:; connect-src 'self'; object-src 'self'; media-src 'self'; worker-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'")
		fn(ctx, res, req)
	}
}

func SecureHeaders(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		if host := Config.Get("general.host").String(); host != "" {
			if req.Host != host && req.Host != fmt.Sprintf("%s:443", host) {
				Log.Error("Invalid access from host: %s", req.Host)
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
		header.Set("X-Frame-Options", "DENY")
		fn(ctx, res, req)
	}
}
