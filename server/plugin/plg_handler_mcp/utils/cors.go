package utils

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func WithCORS(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "mcp-protocol-version, Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		fn(ctx, w, r)
	})
}
