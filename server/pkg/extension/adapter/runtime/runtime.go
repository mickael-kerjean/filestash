package runtime

import (
	"context"
	"fmt"
	"sync"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
)

type Runtime struct {
	wrt  wazero.Runtime
	ctx  context.Context
	sock *SocketConfig

	mu     sync.Mutex
	mod    api.Module
	_cache map[string]api.Function
}

func New(wasm []byte, opts ...Option) (_ *Runtime, err error) {
	var (
		ctx = context.Background()
		c   = &config{
			wrt:  wazero.NewRuntime(ctx),
			fs:   NewFSConfig(),
			sock: NewSocketConfig(),
		}
	)
	defer func() {
		if err != nil {
			c.wrt.Close(ctx)
		}
	}()
	compiled, err := c.wrt.CompileModule(ctx, wasm)
	if err != nil {
		return nil, err
	}

	for _, opt := range opts {
		if err = opt(c); err != nil {
			return nil, err
		}
	}
	if err = c.sock.Apply(ctx, c); err != nil {
		return nil, err
	}
	if err = c.fs.Apply(ctx, c); err != nil {
		return nil, err
	}
	mod, err := c.wrt.InstantiateModule(ctx, compiled, c.mod)
	if err != nil {
		return nil, err
	}
	return &Runtime{ctx: ctx, wrt: c.wrt, sock: c.sock, mod: mod, _cache: map[string]api.Function{}}, nil
}

func (r *Runtime) HasExport(name string) bool {
	return r.mod.ExportedFunction(name) != nil
}

func (r *Runtime) Call(ctx context.Context, fnName string, key, val any) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	fn, ok := r._cache[fnName]
	if !ok {
		fn = r.mod.ExportedFunction(fnName)
		r._cache[fnName] = fn
	}
	if fn == nil {
		return fmt.Errorf("%w: %s", ErrNoExport, fnName)
	}
	_, err := fn.Call(context.WithValue(ctx, key, val))
	return err
}

func (r *Runtime) Close() {
	r.sock.close()
	r.wrt.Close(r.ctx)
}
