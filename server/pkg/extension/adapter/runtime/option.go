package runtime

import (
	"context"

	"github.com/tetratelabs/wazero"
)

type config struct {
	wrt  wazero.Runtime
	mod  wazero.ModuleConfig
	fs   *FSConfig
	sock *SocketConfig
}

type Option func(*config) error

func WithExports(build func(*HostModuleBuilder)) Option {
	return func(c *config) error {
		b := NewHostModuleBuilder(c.wrt, "env")
		build(b)
		return b.Instantiate(context.Background())
	}
}

func WithMount(host string, guest string) Option {
	return func(c *config) error {
		c.fs = c.fs.WithDirMount(host, guest)
		return nil
	}
}

func WithNet(hostport string) Option {
	return func(c *config) error {
		c.sock = c.sock.WithAllowedHost(hostport)
		return nil
	}
}
