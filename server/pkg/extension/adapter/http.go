package adapter

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/runtime"

	"github.com/mickael-kerjean/filestash/server/pkg/admin"
	"github.com/mickael-kerjean/filestash/server/pkg/middleware"
	"github.com/mickael-kerjean/filestash/server/pkg/session"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/gorilla/mux"
)

var middlewares = map[string]Middleware{
	"api_headers":    middleware.ApiHeaders,
	"secure_headers": middleware.SecureHeaders,
	"session_start":  session.Start,
	"session_try":    session.Try,
	"logged_in_only": session.LoggedInOnly,
	"admin_only":     admin.AdminOnly,
	"body_parser":    middleware.BodyParser,
	"rate_limiter":   middleware.RateLimiter,
	"public_cors":    middleware.PublicCORS,
	"secure_origin":  middleware.SecureOrigin,
}

type routesKey struct{}
type route struct {
	method     string
	path       string
	middleware []string
}

func exportHttp(b *runtime.HostModuleBuilder) {
	b.Export("ffi_http_push_route", func(ctx context.Context, mem runtime.IMemory, mPtr, mLen, pPtr, pLen, wPtr, wLen uint32) {
		routes, _ := ctx.Value(routesKey{}).(*[]route)
		r := route{
			method: string(mem.Read(mPtr, mLen)),
			path:   string(mem.Read(pPtr, pLen)),
		}
		if names := string(mem.Read(wPtr, wLen)); names != "" {
			r.middleware = strings.Split(names, ",")
		}
		*routes = append(*routes, r)
	})
}

func (in *Instance) Http() func(*mux.Router) error {
	return func(router *mux.Router) error {
		var routes []route
		if err := in.rt.Call(context.Background(), "http_describe", routesKey{}, &routes); err != nil {
			return err
		}
		for _, rt := range routes {
			chain := make([]Middleware, len(rt.middleware))
			for i, name := range rt.middleware {
				m, ok := middlewares[name]
				if !ok {
					return fmt.Errorf("%w: middleware %s", utils.ErrNotFound, name)
				}
				chain[i] = m
			}
			router.HandleFunc(rt.path, middleware.NewMiddlewareChain(
				func(app *App, w http.ResponseWriter, r *http.Request) {
					if err := in.rt.Call(r.Context(), "http", httpKey{}, &httpData{r: r, w: w}); err != nil {
						utils.Log.Error("extension::adapter http path=%s err=%s", r.URL.Path, err.Error())
					}
				},
				chain,
			)).Methods(rt.method)
		}
		return nil
	}
}
