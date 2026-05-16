package adapter

import (
	"context"
	"errors"
	"log"
	"net/http"

	"github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/abi"
)

type middlewareKey struct{}
type middlewareState struct {
	r    *http.Request
	w    http.ResponseWriter
	next *bool
}

func MiddlewareExtension(wasm []byte) (func(common.HandlerFunc) common.HandlerFunc, error) {
	rt, err := NewRuntime(wasm, middlewareExports())
	if err != nil {
		return nil, err
	}

	return func(next common.HandlerFunc) common.HandlerFunc {
		return func(app *common.App, w http.ResponseWriter, r *http.Request) {
			callNext := false
			err := rt.Call(r.Context(), "middleware", middlewareKey{}, &middlewareState{r: r, w: w, next: &callNext})
			if errors.Is(err, ErrNoExport) || callNext {
				next(app, w, r)
				return
			} else if err != nil {
				log.Printf("middleware plugin call error: %v", err)
			}
		}
	}, nil
}

func middlewareExports() Option {
	return WithExports(func(b *abi.HostModuleBuilder) {
		b.
			HTTPRequestExports(func(ctx context.Context) *http.Request {
				return ctx.Value(middlewareKey{}).(*middlewareState).r
			}).
			HTTPResponseExports(func(ctx context.Context) http.ResponseWriter {
				return ctx.Value(middlewareKey{}).(*middlewareState).w
			}).
			Export("middleware_next", func(ctx context.Context) {
				if s, ok := ctx.Value(middlewareKey{}).(*middlewareState); ok {
					*s.next = true
				}
			})
	})
}
