package middleware

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"net/http"
)

func CtxInjector(fn func(App, http.ResponseWriter, *http.Request), ctx App) http.HandlerFunc {
	return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
		fn(ctx, res, req)
	})
}
