package middleware

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/time/rate"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
)

func ApiHeaders(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		header := res.Header()
		header.Set("Content-Type", "application/json")
		header.Set("Cache-Control", "no-cache")
		authHeader := req.Header.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			header.Set("X-Request-ID", GenerateRequestID("API"))
		}
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
		cspHeader += "style-src 'self' 'unsafe-inline' blob:; "
		cspHeader += "font-src 'self' data: blob:; "
		cspHeader += "manifest-src 'self'; "
		cspHeader += "script-src 'self' 'sha256-JNAde5CZQqXtYRLUk8CGgyJXo6C7Zs1lXPPClLM1YM4=' 'sha256-9/gQeQaAmVkFStl6tfCbHXn8mr6PgtxlH+hEp685lzY=' 'sha256-ER9LZCe8unYk8AJJ2qopE+rFh7OUv8QG5q3h6jZeoSk='; "
		if Config.Get("features.protection.enable_chromecast").Bool() {
			cspHeader += "script-src-elem 'self' 'unsafe-inline' https://www.gstatic.com http://www.gstatic.com; "
		}
		cspHeader += "img-src 'self' blob: data: https://maps.wikimedia.org; "
		cspHeader += "connect-src 'self'; "
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
		header := res.Header()
		if Config.Get("general.force_ssl").Bool() {
			header.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}
		header.Set("X-Content-Type-Options", "nosniff")
		header.Set("X-XSS-Protection", "1; mode=block")
		fn(ctx, res, req)
	}
}

func SecureOrigin(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
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
		} else if apiKey := req.URL.Query().Get("key"); apiKey != "" { // API Access
			fn(ctx, res, req)
			return
		}

		Log.Warning("Intrusion detection: %s - %s", RetrievePublicIp(req), req.URL.String())
		SendErrorResult(res, ErrNotAllowed)
	}
}

func WithPublicAPI(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		apiKey := req.URL.Query().Get("key")
		if apiKey == "" {
			fn(ctx, res, req)
			return
		}
		res.Header().Set("X-Request-ID", GenerateRequestID("API"))
		host, err := VerifyApiKey(apiKey)
		if err != nil {
			Log.Debug("middleware::http api verification error '%s'", err.Error())
			EnableCors(req, res, "*")
			SendErrorResult(res, NewError(fmt.Sprintf(
				"Invalid API Key provided: '%s'",
				apiKey,
			), 401))
			return
		}
		if err = EnableCors(req, res, host); err != nil {
			EnableCors(req, res, "*")
			SendErrorResult(res, err)
			return
		}
		fn(ctx, res, req)
	}
}

var limiter = rate.NewLimiter(10, 1000)

func RateLimiter(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if limiter.Allow() == false {
			Log.Warning("middleware::http::ratelimit too many requests")
			SendErrorResult(
				res,
				NewError(http.StatusText(http.StatusTooManyRequests), http.StatusTooManyRequests),
			)
			return
		}
		fn(ctx, res, req)
	}
}

func EnableCors(req *http.Request, res http.ResponseWriter, host string) error {
	if host == "" {
		return nil
	}
	origin := req.Header.Get("Origin")
	if origin == "" { // cors is only for browser client
		return nil
	}
	h := res.Header()
	if host == "*" {
		h.Set("Access-Control-Allow-Origin", "*")
	} else {
		u, err := url.Parse(origin)
		if err != nil {
			Log.Debug("middleware::http origin isn't valid - '%s'", origin)
			return ErrNotAllowed
		}
		if u.Host != host {
			Log.Debug("middleware::http host missmatch for host[%s] origin[%s]", host, u.Host)
			return NewError("Invalid host for the selected key", 401)
		}
		if u.Scheme != "https" && strings.HasPrefix(u.Host, "localhost:") == false {
			return NewError("API access can only be done using https", 401)
		}
		h.Set("Access-Control-Allow-Origin", fmt.Sprintf("%s://%s", u.Scheme, host))
	}
	method := req.Header.Get("Access-Control-Request-Method")
	if method == "" {
		method = "GET"
	}
	h.Set("Access-Control-Allow-Methods", method)
	h.Set("Access-Control-Allow-Headers", "Authorization")
	return nil
}

func RetrievePublicIp(req *http.Request) string {
	if req.Header.Get("X-Forwarded-For") != "" {
		return req.Header.Get("X-Forwarded-For")
	} else { 
		return req.RemoteAddr
	}
}