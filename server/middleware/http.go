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
	var (
		headerContentType  = []string{"application/json"}
		headerContentCache = []string{"no-cache"}
	)
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header["Content-Type"] = headerContentType
		header["Cache-Control"] = headerContentCache
		if id := req.Header.Get("X-Request-Id"); id != "" {
			header["X-Request-Id"] = []string{id}
		}
		fn(ctx, res, req)
	})
}

func StaticHeaders(fn HandlerFunc) HandlerFunc {
	var headerContentCache = []string{"max-age=2592000"}
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header["Cache-Control"] = headerContentCache
		header["Content-Type"] = []string{GetMimeType(filepath.Ext(req.URL.Path))}
		fn(ctx, res, req)
	})
}

func PublicCORS(fn HandlerFunc) HandlerFunc {
	var (
		headerAccessControlAllowOrigin  = []string{"*"}
		headerAccessControlAllowHeaders = []string{"x-requested-with, x-request-id"}
		headerAccessControlAllowMethods = []string{"GET, OPTIONS"}
	)
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header["Access-Control-Allow-Origin"] = headerAccessControlAllowOrigin
		header["Access-Control-Allow-Headers"] = headerAccessControlAllowHeaders
		if req.Method == http.MethodOptions {
			header["Access-Control-Allow-Methods"] = headerAccessControlAllowMethods
			res.WriteHeader(http.StatusNoContent)
			return
		}
		fn(ctx, res, req)
	})
}

func IndexHeaders(fn HandlerFunc) HandlerFunc {
	var (
		headerContentType         = []string{"text/html"}
		headerCacheControl        = []string{"no-cache"}
		headerReferrerPolicy      = []string{"same-origin"}
		headerXContentTypeOptions = []string{"nosniff"}
		headerXXSSProtection      = []string{"1; mode=block"}
		headerXPoweredBy          = []string{fmt.Sprintf("Filestash/%s.%s <https://filestash.app>", APP_VERSION, BUILD_DATE)}
		headerXFrameOptions       = []string{"DENY"}
	)
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header["Content-Type"] = headerContentType
		header["Cache-Control"] = headerCacheControl
		header["Referrer-Policy"] = headerReferrerPolicy
		header["X-Content-Type-Options"] = headerXContentTypeOptions
		header["X-XSS-Protection"] = headerXXSSProtection
		if !IsWhiteLabel() {
			header["X-Powered-By"] = headerXPoweredBy
		}
		if ori := Config.Get("features.protection.iframe").String(); ori == "" {
			header["X-Frame-Options"] = headerXFrameOptions
		}
		fn(ctx, res, req)
	})
}

func SecureHeaders(fn HandlerFunc) HandlerFunc {
	var (
		headerStrictTransportSecurity = []string{"max-age=31536000; includeSubDomains; preload"}
		headerXContentTypeOptions     = []string{"nosniff"}
		headerXXSSProtection          = []string{"1; mode=block"}
	)
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		if Config.Get("general.force_ssl").Bool() {
			header["Strict-Transport-Security"] = headerStrictTransportSecurity
		}
		header["X-Content-Type-Options"] = headerXContentTypeOptions
		header["X-XSS-Protection"] = headerXXSSProtection
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
			SendErrorResult(res, NewError(http.StatusText(http.StatusTooManyRequests), http.StatusTooManyRequests))
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
