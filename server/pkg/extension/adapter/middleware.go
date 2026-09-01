package adapter

import (
	"context"
	"errors"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/runtime"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func exportMiddleware(b *runtime.HostModuleBuilder) {
	b.Export("ffi_middleware_push_next", func(ctx context.Context) {
		stateHttp(ctx).next = true
	})
}

func (in *Instance) Middleware() func(HandlerFunc) HandlerFunc {
	return func(next HandlerFunc) HandlerFunc {
		return func(app *App, w http.ResponseWriter, r *http.Request) {
			hd := &httpData{r: r, w: w}
			err := in.rt.Call(r.Context(), "middleware", httpKey{}, hd)
			if errors.Is(err, runtime.ErrNoExport) || hd.next {
				next(app, w, r)
				return
			} else if err != nil {
				utils.Log.Error("middleware plugin call error: %v", err)
			}
		}
	}
}
