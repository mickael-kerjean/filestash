package token

import (
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/cookie"
)

func Extract(req *http.Request) string {
	// strategy 1: split cookie
	token := ExtractFromCookies(req.Cookies())
	if token != "" {
		return token
	}
	// strategy 2: Authorization header
	authHeader := req.Header.Get("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(req.Header.Get("Authorization"), "Bearer ")
	}
	// strategy 3: Authorization query param
	if auth := req.URL.Query().Get("authorization"); auth != "" {
		return auth
	}
	return ""
}

func ExtractFromCookies(cookies []*http.Cookie) string {
	var (
		token strings.Builder
		index int
	)
	for _, cookie := range cookies {
		if cookie.Name == cookieName(index) {
			index++
			token.WriteString(cookie.Value)
		}
	}
	return token.String()
}

func Inject(res http.ResponseWriter, req *http.Request, token string) {
	index := 0
	end := 0
	for {
		if len(token) >= (index+1)*COOKIE_MAX_SIZE {
			end = (index + 1) * COOKIE_MAX_SIZE
		} else {
			end = len(token)
		}
		http.SetCookie(res, cookie.Create(&http.Cookie{
			Name:   cookieName(index),
			Value:  token[index*COOKIE_MAX_SIZE : end],
			MaxAge: 60 * Config.Get("general.cookie_timeout").Int(),
			Path:   COOKIE_PATH,
		}, cookie.WithRules(req)))
		if end == len(token) {
			break
		} else {
			index++
		}
	}
}

func Clear(res http.ResponseWriter, req *http.Request) {
	index := 0
	for {
		_, err := req.Cookie(cookieName(index))
		if err != nil {
			break
		}
		http.SetCookie(res, cookie.Create(&http.Cookie{
			Name:   cookieName(index),
			Value:  "",
			MaxAge: -1,
			Path:   COOKIE_PATH,
		}, cookie.WithRules(req)))
		index++
	}
}
