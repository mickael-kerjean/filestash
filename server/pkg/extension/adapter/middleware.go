package adapter

import (
	"context"
	"errors"
	"log"
	"net/http"

	"github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/runtime"
)

type middlewareKey struct{}
type middlewareState struct {
	r    *http.Request
	w    http.ResponseWriter
	next *bool
}

func MiddlewareExtension(wasm []byte) (func(common.HandlerFunc) common.HandlerFunc, error) {
	rt, err := runtime.New(wasm, middlewareExports())
	if err != nil {
		return nil, err
	}

	return func(next common.HandlerFunc) common.HandlerFunc {
		return func(app *common.App, w http.ResponseWriter, r *http.Request) {
			callNext := false
			err := rt.Call(r.Context(), "middleware", middlewareKey{}, &middlewareState{r: r, w: w, next: &callNext})
			if errors.Is(err, runtime.ErrNoExport) || callNext {
				next(app, w, r)
				return
			} else if err != nil {
				log.Printf("middleware plugin call error: %v", err)
			}
		}
	}, nil
}

func middlewareExports() runtime.Option {
	state := func(ctx context.Context) *middlewareState {
		s, _ := ctx.Value(middlewareKey{}).(*middlewareState)
		return s
	}
	return runtime.WithExports(func(b *runtime.HostModuleBuilder) {
		b.
			Export("req_method", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
				return mem.Write(outPtr, outCap, []byte(state(ctx).r.Method))
			}).
			Export("req_path", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
				return mem.Write(outPtr, outCap, []byte(state(ctx).r.URL.Path))
			}).
			Export("req_header_get", func(ctx context.Context, mem runtime.IMemory, nPtr, nLen, outPtr, outCap uint32) uint32 {
				name := string(mem.Read(nPtr, nLen))
				return mem.Write(outPtr, outCap, []byte(state(ctx).r.Header.Get(name)))
			}).
			Export("req_body_read", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
				buf := make([]byte, outCap)
				n, _ := state(ctx).r.Body.Read(buf)
				return mem.Write(outPtr, outCap, buf[:n])
			}).
			Export("resp_status", func(ctx context.Context, code uint32) {
				state(ctx).w.WriteHeader(int(code))
			}).
			Export("resp_header", func(ctx context.Context, mem runtime.IMemory, kPtr, kLen, vPtr, vLen uint32) {
				state(ctx).w.Header().Set(
					string(mem.Read(kPtr, kLen)),
					string(mem.Read(vPtr, vLen)),
				)
			}).
			Export("resp_write", func(ctx context.Context, mem runtime.IMemory, ptr, length uint32) {
				state(ctx).w.Write(mem.Read(ptr, length))
			}).
			Export("middleware_next", func(ctx context.Context) {
				*state(ctx).next = true
			})
	})
}
