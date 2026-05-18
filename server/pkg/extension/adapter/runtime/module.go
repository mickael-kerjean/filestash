package runtime

import (
	"context"

	"github.com/tetratelabs/wazero"
)

type HostModuleBuilder struct {
	inner wazero.HostModuleBuilder
}

func NewHostModuleBuilder(wrt wazero.Runtime, name string) *HostModuleBuilder {
	return &HostModuleBuilder{inner: wrt.NewHostModuleBuilder(name)}
}

func (b *HostModuleBuilder) Export(name string, fn any) *HostModuleBuilder {
	b.inner.NewFunctionBuilder().WithFunc(wazeroMemoryAdapter(fn)).Export(name)
	return b
}

func (b *HostModuleBuilder) Instantiate(ctx context.Context) error {
	_, err := b.inner.Instantiate(ctx)
	return err
}
