package runtime

import (
	"context"

	"github.com/tetratelabs/wazero"
)

type Option func(wazero.Runtime) error

func WithExports(build func(*HostModuleBuilder)) Option {
	return func(wrt wazero.Runtime) error {
		b := NewHostModuleBuilder(wrt, "env")
		build(b)
		return b.Instantiate(context.Background())
	}
}
