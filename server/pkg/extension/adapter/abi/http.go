package abi

import (
	"context"
	"net/http"

	"github.com/tetratelabs/wazero/api"
)

type HTTPRequestGetter func(ctx context.Context) *http.Request
type HTTPResponseGetter func(ctx context.Context) http.ResponseWriter

func (b *HostModuleBuilder) HTTPRequestExports(get HTTPRequestGetter) *HostModuleBuilder {
	return b.
		Export("req_method", reqMethod(get)).
		Export("req_path", reqPath(get)).
		Export("req_header_get", reqHeaderGet(get)).
		Export("req_body_read", reqBodyRead(get))
}

func (b *HostModuleBuilder) HTTPResponseExports(get HTTPResponseGetter) *HostModuleBuilder {
	return b.
		Export("resp_status", respStatus(get)).
		Export("resp_header", respHeaderSet(get)).
		Export("resp_write", respWrite(get))
}

func reqMethod(get HTTPRequestGetter) func(context.Context, api.Module, uint32, uint32) uint32 {
	return func(ctx context.Context, mod api.Module, outPtr, outCap uint32) uint32 {
		return writeOut(mod, outPtr, outCap, []byte(get(ctx).Method))
	}
}

func reqPath(get HTTPRequestGetter) func(context.Context, api.Module, uint32, uint32) uint32 {
	return func(ctx context.Context, mod api.Module, outPtr, outCap uint32) uint32 {
		return writeOut(mod, outPtr, outCap, []byte(get(ctx).URL.Path))
	}
}

func reqHeaderGet(get HTTPRequestGetter) func(context.Context, api.Module, uint32, uint32, uint32, uint32) uint32 {
	return func(ctx context.Context, mod api.Module, nPtr, nLen, outPtr, outCap uint32) uint32 {
		name, ok := mod.Memory().Read(nPtr, nLen)
		if !ok {
			return 0
		}
		val := get(ctx).Header.Get(string(name))
		return writeOut(mod, outPtr, outCap, []byte(val))
	}
}

func reqBodyRead(get HTTPRequestGetter) func(context.Context, api.Module, uint32, uint32) uint32 {
	return func(ctx context.Context, mod api.Module, outPtr, outCap uint32) uint32 {
		buf := make([]byte, outCap)
		n, _ := get(ctx).Body.Read(buf)
		if n > 0 {
			mod.Memory().Write(outPtr, buf[:n])
			return uint32(n)
		}
		return 0
	}
}

func respStatus(get HTTPResponseGetter) func(context.Context, api.Module, uint32) {
	return func(ctx context.Context, _ api.Module, code uint32) {
		get(ctx).WriteHeader(int(code))
	}
}

func respHeaderSet(get HTTPResponseGetter) func(context.Context, api.Module, uint32, uint32, uint32, uint32) {
	return func(ctx context.Context, mod api.Module, kPtr, kLen, vPtr, vLen uint32) {
		k, _ := mod.Memory().Read(kPtr, kLen)
		v, _ := mod.Memory().Read(vPtr, vLen)
		get(ctx).Header().Set(string(k), string(v))
	}
}

func respWrite(get HTTPResponseGetter) func(context.Context, api.Module, uint32, uint32) {
	return func(ctx context.Context, mod api.Module, ptr, length uint32) {
		data, ok := mod.Memory().Read(ptr, length)
		if !ok {
			return
		}
		cp := make([]byte, len(data))
		copy(cp, data)
		get(ctx).Write(cp)
	}
}
