package adapter

import (
	"context"
	"net/http"

	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/runtime"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

type Instance struct {
	rt *runtime.Runtime
}

func NewInstance(wasm []byte) (*Instance, error) {
	rt, err := runtime.New(wasm, runtime.WithExports(func(b *runtime.HostModuleBuilder) {
		exportShared(b)
		exportAuthorisation(b)
		exportMiddleware(b)
		exportHttp(b)
	}))
	if err != nil {
		return nil, err
	}
	if err := rt.Call(context.Background(), "init", appKey{}, nil); err != nil {
		rt.Close()
		return nil, err
	}
	return &Instance{rt: rt}, nil
}

func (in *Instance) Provides(capability string) bool {
	return in.rt.HasExport("capability_" + capability)
}

type appKey struct{}

type httpKey struct{}
type httpData struct {
	r    *http.Request
	w    http.ResponseWriter
	next bool
}

func stateHttp(ctx context.Context) *httpData {
	d, _ := ctx.Value(httpKey{}).(*httpData)
	return d
}

func exportShared(b *runtime.HostModuleBuilder) {
	b.Export("log", func(ctx context.Context, mem runtime.IMemory, level, ptr, length uint32) {
		msg := string(mem.Read(ptr, length))
		switch level {
		case 1:
			utils.Log.Error("%s", msg)
		case 2:
			utils.Log.Warning("%s", msg)
		case 3:
			utils.Log.Info("%s", msg)
		default:
			utils.Log.Debug("%s", msg)
		}
	}).Export("resp_status", func(ctx context.Context, code uint32) {
		stateHttp(ctx).w.WriteHeader(int(code))
	}).Export("resp_header", func(ctx context.Context, mem runtime.IMemory, kPtr, kLen, vPtr, vLen uint32) {
		stateHttp(ctx).w.Header().Set(
			string(mem.Read(kPtr, kLen)),
			string(mem.Read(vPtr, vLen)),
		)
	}).Export("resp_write", func(ctx context.Context, mem runtime.IMemory, ptr, length uint32) {
		stateHttp(ctx).w.Write(mem.Read(ptr, length))
	}).Export("req_method", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
		return mem.Write(outPtr, outCap, []byte(stateHttp(ctx).r.Method))
	}).Export("req_path", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
		return mem.Write(outPtr, outCap, []byte(stateHttp(ctx).r.URL.Path))
	}).Export("req_header", func(ctx context.Context, mem runtime.IMemory, nPtr, nLen, outPtr, outCap uint32) uint32 {
		return mem.Write(outPtr, outCap, []byte(stateHttp(ctx).r.Header.Get(string(mem.Read(nPtr, nLen)))))
	})
}
