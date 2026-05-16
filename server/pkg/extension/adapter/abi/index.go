package abi

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

func (b *HostModuleBuilder) Export(name string, fn any) *HostModuleBuilder {
	b.inner.NewFunctionBuilder().WithFunc(fn).Export(name)
	return b
}

func (b *HostModuleBuilder) Instantiate(ctx context.Context) error {
	_, err := b.inner.Instantiate(ctx)
	return err
}

func writeOut(mod api.Module, outPtr, outCap uint32, data []byte) uint32 {
	n := uint32(len(data))
	if n == 0 {
		return 0
	}
	if n > outCap {
		return n
	}
	mod.Memory().Write(outPtr, data)
	return n
}
