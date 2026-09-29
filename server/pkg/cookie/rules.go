package cookie

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

type option func(*http.Cookie)

func Create(cookie *http.Cookie, opts ...option) *http.Cookie {
	for _, opt := range opts {
		opt(cookie)
	}
	return cookie
}

func WithRules(req *http.Request) option {
	return func(c *http.Cookie) {
		c.HttpOnly = true
		c.SameSite = http.SameSiteStrictMode
		if Config.Get("features.protection.iframe").String() != "" {
			if isTLS(req) {
				c.Secure = true
				c.SameSite = http.SameSiteNoneMode
				c.Partitioned = true
			} else {
				Log.Warning("iframe is enabled but Filestash is not served over TLS. Either use SSL (set X-Forwarded-Proto from your reverse proxy or enable force_ssl) or disable iframe from the admin console.")
			}
		}
	}
}

func isTLS(req *http.Request) bool {
	if req.TLS != nil {
		return true
	} else if req.Header.Get("X-Forwarded-Proto") == "https" {
		return true
	} else if Config.Get("general.force_ssl").Bool() {
		return true
	}
	return false
}

func WithSameSite(val http.SameSite) option {
	return func(c *http.Cookie) {
		c.SameSite = val
	}
}
