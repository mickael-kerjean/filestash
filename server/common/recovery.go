package common

import (
	"net/http"
)

// previous cookie configuration in canary release of 2024/10 break existing cookie and
// can introduce weird error when a user has things in cache.
// this code will deprecate early 2025
func RecoverFromBadCookie(res http.ResponseWriter) {
	Log.Debug("common::recovery exec=RecoverFromBadCookie")
	http.SetCookie(res, &http.Cookie{
		Name:     "auth",
		Value:    "",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		Path:     WithBase("/api/"),
		Secure:   false,
	})
}
