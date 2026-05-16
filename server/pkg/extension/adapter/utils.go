package adapter

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/abi"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
)

var ErrNoExport = errors.New("plugin: export not found")

type Runtime struct {
	wrt wazero.Runtime
	ctx context.Context

	mu  sync.Mutex
	mod api.Module
}

type Option func(wazero.Runtime) error

func WithExports(build func(*abi.HostModuleBuilder)) Option {
	return func(wrt wazero.Runtime) error {
		b := abi.NewHostModuleBuilder(wrt, "env")
		build(b)
		return b.Instantiate(context.Background())
	}
}

func NewRuntime(wasm []byte, opts ...Option) (*Runtime, error) {
	ctx := context.Background()
	wrt := wazero.NewRuntime(ctx)
	wasi_snapshot_preview1.MustInstantiate(ctx, wrt)

	for _, opt := range opts {
		if err := opt(wrt); err != nil {
			wrt.Close(ctx)
			return nil, err
		}
	}

	compiled, err := wrt.CompileModule(ctx, wasm)
	if err != nil {
		wrt.Close(ctx)
		return nil, err
	}
	mod, err := wrt.InstantiateModule(ctx, compiled, wazero.NewModuleConfig())
	if err != nil {
		wrt.Close(ctx)
		return nil, err
	}
	return &Runtime{wrt: wrt, ctx: ctx, mod: mod}, nil
}

func (r *Runtime) Close() { r.wrt.Close(r.ctx) }

func (r *Runtime) Call(ctx context.Context, fnName string, key, val any) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	fn := r.mod.ExportedFunction(fnName)
	if fn == nil {
		return fmt.Errorf("%w: %s", ErrNoExport, fnName)
	}
	_, err := fn.Call(context.WithValue(ctx, key, val))
	return err
}
