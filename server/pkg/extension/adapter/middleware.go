package adapter

import (
	"context"
	"errors"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/runtime"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

type middlewareKey struct{}
type middlewareData struct {
	next bool
}

func stateMiddleware(ctx context.Context) *middlewareData {
	d, _ := ctx.Value(middlewareKey{}).(*middlewareData)
	return d
}

func exportMiddleware(b *runtime.HostModuleBuilder) {
	b.Export("ffi_middleware_push_next", func(ctx context.Context) {
		stateMiddleware(ctx).next = true
	})
}

func (in *Instance) Middleware() func(HandlerFunc) HandlerFunc {
	return func(next HandlerFunc) HandlerFunc {
		return func(app *App, w http.ResponseWriter, r *http.Request) {
			md := middlewareData{next: false}
			err := in.rt.Call(withHttp(r.Context(), app, w, r), "middleware", middlewareKey{}, &md)
			if errors.Is(err, runtime.ErrNoExport) || md.next {
				next(app, w, r)
				return
			} else if err != nil {
				utils.Log.Error("middleware plugin call error: %v", err)
			}
		}
	}
}
