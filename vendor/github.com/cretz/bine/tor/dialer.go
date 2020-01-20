package tor

import (
	"context"
	"fmt"
	"net"
	"strings"

	"golang.org/x/net/proxy"
)

// Dialer is a wrapper around a proxy.Dialer for dialing connections.
type Dialer struct {
	proxy.Dialer
}

// DialConf is the configuration used for Dialer.
type DialConf struct {
	// ProxyAddress is the address for the SOCKS5 proxy. If empty, it is looked
	// up.
	ProxyAddress string

	// ProxyNetwork is the network for the SOCKS5 proxy. If ProxyAddress is
	// empty, this value is ignored and overridden by what is looked up. If this
	// is empty and ProxyAddress is not empty, it defaults to "tcp".
	ProxyNetwork string

	// ProxyAuth is the auth for the proxy. Since Tor's SOCKS5 proxy is
	// unauthenticated, this is rarely needed. It can be used when
	// IsolateSOCKSAuth is set to ensure separate circuits.
	//
	// This should not be confused with downstream SOCKS proxy authentication
	// which is set via Tor values for Socks5ProxyUsername and
	// Socks5ProxyPassword when Socks5Proxy is set.
	ProxyAuth *proxy.Auth

	// SkipEnableNetwork, if true, will skip the enable network step in Dialer.
	SkipEnableNetwork bool

	// Forward is the dialer to forward to. If nil, just uses normal net dialer.
	Forward proxy.Dialer
}

// Dialer creates a new Dialer for the given configuration. Context can be nil.
// If conf is nil, a default is used.
func (t *Tor) Dialer(ctx context.Context, conf *DialConf) (*Dialer, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if conf == nil {
		conf = &DialConf{}
	}
	// Enable the network if requested
	if !conf.SkipEnableNetwork {
		if err := t.EnableNetwork(ctx, true); err != nil {
			return nil, err
		}
	}
	// Lookup proxy address as needed
	proxyNetwork := conf.ProxyNetwork
	proxyAddress := conf.ProxyAddress
	if proxyAddress == "" {
		info, err := t.Control.GetInfo("net/listeners/socks")
		if err != nil {
			return nil, err
		}
		if len(info) != 1 || info[0].Key != "net/listeners/socks" {
			return nil, fmt.Errorf("Unable to get socks proxy address")
		}
		proxyAddress = info[0].Val
		if strings.HasPrefix(proxyAddress, "unix:") {
			proxyAddress = proxyAddress[5:]
			proxyNetwork = "unix"
		} else {
			proxyNetwork = "tcp"
		}
	} else if proxyNetwork == "" {
		proxyNetwork = "tcp"
	}

	dialer, err := proxy.SOCKS5(proxyNetwork, proxyAddress, conf.ProxyAuth, conf.Forward)
	if err != nil {
		return nil, err
	}
	return &Dialer{dialer}, nil
}

// DialContext is the equivalent of net.DialContext.
//
// TODO: Remove when https://github.com/golang/go/issues/17759 is released.
func (d *Dialer) DialContext(ctx context.Context, network string, addr string) (net.Conn, error) {
	errCh := make(chan error, 1)
	connCh := make(chan net.Conn, 1)
	go func() {
		if conn, err := d.Dial(network, addr); err != nil {
			errCh <- err
		} else if ctx.Err() != nil {
			conn.Close()
		} else {
			connCh <- conn
		}
	}()
	select {
	case err := <-errCh:
		return nil, err
	case conn := <-connCh:
		return conn, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}
