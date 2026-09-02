package runtime

import (
	"context"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
)

type HostModuleBuilder struct {
	inner wazero.HostModuleBuilder
}

func NewHostModuleBuilder(wrt wazero.Runtime, name string) *HostModuleBuilder {
	return &HostModuleBuilder{inner: wrt.NewHostModuleBuilder(name)}
}

var i32 = api.ValueTypeI32

func (b *HostModuleBuilder) Export(name string, fn any) *HostModuleBuilder {
	var (
		gofn    api.GoModuleFunction
		params  []api.ValueType
		results []api.ValueType
		cached  IMemory
	)
	mem := func(mod api.Module) IMemory {
		if cached == nil {
			cached = wazeroMem{mod.Memory()}
		}
		return cached
	}
	switch f := fn.(type) {
	case func(context.Context):
		gofn = api.GoModuleFunc(func(ctx context.Context, mod api.Module, stack []uint64) {
			f(ctx)
		})
	case func(context.Context, uint32):
		params = []api.ValueType{i32}
		gofn = api.GoModuleFunc(func(ctx context.Context, mod api.Module, stack []uint64) {
			f(ctx, uint32(stack[0]))
		})
	case func(context.Context, IMemory, uint32, uint32):
		params = []api.ValueType{i32, i32}
		gofn = api.GoModuleFunc(func(ctx context.Context, mod api.Module, stack []uint64) {
			f(ctx, mem(mod), uint32(stack[0]), uint32(stack[1]))
		})
	case func(context.Context, IMemory, uint32, uint32) uint32:
		params = []api.ValueType{i32, i32}
		results = []api.ValueType{i32}
		gofn = api.GoModuleFunc(func(ctx context.Context, mod api.Module, stack []uint64) {
			stack[0] = uint64(f(ctx, mem(mod), uint32(stack[0]), uint32(stack[1])))
		})
	case func(context.Context, IMemory, uint32, uint32, uint32):
		params = []api.ValueType{i32, i32, i32}
		gofn = api.GoModuleFunc(func(ctx context.Context, mod api.Module, stack []uint64) {
			f(ctx, mem(mod), uint32(stack[0]), uint32(stack[1]), uint32(stack[2]))
		})
	case func(context.Context, IMemory, uint32, uint32, uint32, uint32):
		params = []api.ValueType{i32, i32, i32, i32}
		gofn = api.GoModuleFunc(func(ctx context.Context, mod api.Module, stack []uint64) {
			f(ctx, mem(mod), uint32(stack[0]), uint32(stack[1]), uint32(stack[2]), uint32(stack[3]))
		})
	case func(context.Context, IMemory, uint32, uint32, uint32, uint32) uint32:
		params = []api.ValueType{i32, i32, i32, i32}
		results = []api.ValueType{i32}
		gofn = api.GoModuleFunc(func(ctx context.Context, mod api.Module, stack []uint64) {
			stack[0] = uint64(f(ctx, mem(mod), uint32(stack[0]), uint32(stack[1]), uint32(stack[2]), uint32(stack[3])))
		})
	default:
		panic("runtime: unsupported export signature for " + name)
	}
	b.inner.NewFunctionBuilder().WithGoModuleFunction(gofn, params, results).Export(name)
	return b
}

func (b *HostModuleBuilder) Instantiate(ctx context.Context) error {
	_, err := b.inner.Instantiate(ctx)
	return err
}
