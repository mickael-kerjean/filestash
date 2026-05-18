package runtime

import (
	"context"
	"fmt"
	"sync"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
)

type Runtime struct {
	wrt wazero.Runtime
	ctx context.Context

	mu  sync.Mutex
	mod api.Module
}

func New(wasm []byte, opts ...Option) (*Runtime, error) {
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
	return &Runtime{ctx: ctx, wrt: wrt, mod: mod}, nil
}

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

func (r *Runtime) Close() {
	r.wrt.Close(r.ctx)
}
