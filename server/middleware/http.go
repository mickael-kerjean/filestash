package middleware

import (
	. "github.com/mickael-kerjean/nuage/server/common"
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
		fn(ctx, res, req)
	}
}

func SecureHeaders(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		if host := Config.Get("general.host").String(); host != "" {
			if req.Host != host {
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
