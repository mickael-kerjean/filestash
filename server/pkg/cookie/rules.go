package cookie

import (
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
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
			if f := req.Header.Get("Referer"); strings.HasPrefix(f, "https://") {
				c.Secure = true
				c.SameSite = http.SameSiteNoneMode
				c.Partitioned = true
			} else {
				Log.Warning("you are trying to access Filestash from a non secure origin ('%s') and with iframe enabled. Either use SSL or disable iframe from the admin console.", f)
			}
		}
	}
}

func WithSameSite(val http.SameSite) option {
	return func(c *http.Cookie) {
		c.SameSite = val
	}
}
