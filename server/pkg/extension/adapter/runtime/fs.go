package runtime

import (
	"context"
	"crypto/rand"

	"github.com/tetratelabs/wazero"
)

type FSConfig struct {
	inner wazero.FSConfig
}

func NewFSConfig() *FSConfig {
	return &FSConfig{inner: wazero.NewFSConfig()}
}

func (f *FSConfig) WithDirMount(host string, guest string) *FSConfig {
	f.inner = f.inner.WithDirMount(host, guest)
	return f
}

func (f *FSConfig) Apply(ctx context.Context, c *config) error {
	c.mod = wazero.NewModuleConfig().
		WithFSConfig(f.inner).
		WithSysWalltime().
		WithSysNanotime().
		WithRandSource(rand.Reader)
	return nil
}
