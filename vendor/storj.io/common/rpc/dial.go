// Copyright (C) 2019 Storj Labs, Inc.
// See LICENSE for copying information.

package rpc

import (
	"context"
	"crypto/tls"
	"net"
	"time"

	"github.com/zeebo/errs"

	"storj.io/common/peertls/tlsopts"
	"storj.io/common/rpc/rpcpool"
	"storj.io/common/rpc/rpctracing"
	"storj.io/common/storj"
	"storj.io/drpc"
	"storj.io/drpc/drpcconn"
	"storj.io/drpc/drpcmanager"
	"storj.io/drpc/drpcstream"
)

// NewDefaultManagerOptions returns the default options we use for drpc managers.
func NewDefaultManagerOptions() drpcmanager.Options {
	return drpcmanager.Options{
		WriterBufferSize: 1024,
		Stream: drpcstream.Options{
			SplitSize: (4096 * 2) - 256,
		},
		// TODO: bring back inactivity timeouts once more clients support closed
		// connections more robustly. once we do bring it back, it should probably
		// be long enough to account for a full segment upload to nodes in most
		// cases (the satellite conn will be inactive while uploading to storage
		// nodes). Maybe this should be a couple of minutes at least?
		InactivityTimeout: -1,
	}
}

// Dialer holds configuration for dialing.
type Dialer struct {
	// TLSOptions controls the tls options for dialing with NodeID verification.
	// If it is nil, only insecure connections can be made.
	TLSOptions *tlsopts.Options

	// Override system TLS settings when using hostname verification
	HostnameTLSConfig *tls.Config

	// DialTimeout causes all the tcp dials to error if they take longer
	// than it if it is non-zero.
	DialTimeout time.Duration

	// DialLatency sleeps this amount if it is non-zero before every dial.
	// The timeout runs while the sleep is happening.
	DialLatency time.Duration

	// Pool is the shared connection pool for this dialer.
	Pool *rpcpool.Pool

	// ConnectionOptions controls the options that we pass to drpc connections.
	ConnectionOptions drpcconn.Options

	// Connector is how sockets are opened. If nil, net.Dialer is used.
	Connector Connector
}

// NewDefaultDialer returns a Dialer with default options set.
func NewDefaultDialer(tlsOptions *tlsopts.Options) Dialer {
	return Dialer{
		TLSOptions:  tlsOptions,
		DialTimeout: 20 * time.Second,
		ConnectionOptions: drpcconn.Options{
			Manager: NewDefaultManagerOptions(),
		},
		Connector: NewHybridConnector(),
	}
}

// NewDefaultPooledDialer returns a Dialer with default options set and a
// long lived dialer shared connection pool. This is appropriate for longer
// lived processes with more resources.
func NewDefaultPooledDialer(tlsOptions *tlsopts.Options) Dialer {
	dialer := NewDefaultDialer(tlsOptions)
	dialer.Pool = NewDefaultConnectionPool()
	return dialer
}

// NewDefaultConnectionPool returns a rpc Pool with default options set.
func NewDefaultConnectionPool() *rpcpool.Pool {
	return rpcpool.New(rpcpool.Options{
		Capacity:       100,
		KeyCapacity:    5,
		IdleExpiration: 2 * time.Minute,
	})
}

//
// dialing APIs
//

// DialNodeURL dials to the specified node url and asserts it has the given node id.
func (d Dialer) DialNodeURL(ctx context.Context, nodeURL storj.NodeURL) (_ *Conn, err error) {
	defer mon.Task()(&ctx, "node: "+nodeURL.String())(&err)

	if d.TLSOptions == nil {
		return nil, Error.New("tls options not set when required for this dial")
	}

	return d.dialPool(ctx, "node:"+nodeURL.ID.String(), func(ctx context.Context) (drpc.Conn, *tls.ConnectionState, error) {
		// check for a quic rollout, and if not, force tcp.
		if !checkQUICRolloutState(ctx, nodeURL.ID) {
			ctx = hyrbidConnectorContextWithForcedKind(ctx, "tcp")
		}
		return d.dialEncryptedConn(ctx, nodeURL.Address, d.TLSOptions.ClientTLSConfig(nodeURL.ID))
	})
}

// DialAddressInsecure dials to the specified address and does not check the node id.
func (d Dialer) DialAddressInsecure(ctx context.Context, address string) (_ *Conn, err error) {
	defer mon.Task()(&ctx)(&err)

	if d.TLSOptions == nil {
		return nil, Error.New("tls options not set when required for this dial")
	}

	return d.dialPool(ctx, "insecure:"+address, func(ctx context.Context) (drpc.Conn, *tls.ConnectionState, error) {
		// check for a quic rollout, and if not, force tcp.
		if !checkQUICRolloutState(ctx, storj.NodeID{}) {
			ctx = hyrbidConnectorContextWithForcedKind(ctx, "tcp")
		}
		return d.dialEncryptedConn(ctx, address, d.TLSOptions.UnverifiedClientTLSConfig())
	})
}

// DialAddressHostnameVerification dials to the specified address and assumes that the
// server will valdiate their hostname with the system/browser CA, unless overridden.
// It ignores any TLSOptions set on the dialer.
func (d Dialer) DialAddressHostnameVerification(ctx context.Context, address string) (_ *Conn, err error) {
	defer mon.Task()(&ctx)(&err)

	// clear out TLS options so that the cache does not include it as part of the key.
	d.TLSOptions = nil

	var tlsConfig *tls.Config
	if d.HostnameTLSConfig == nil {
		tlsConfig = new(tls.Config)
	} else {
		// clone for thread safety
		tlsConfig = d.HostnameTLSConfig.Clone()
	}

	if tlsConfig.ServerName == "" {
		host, _, err := net.SplitHostPort(address)
		if err != nil {
			return nil, Error.Wrap(err)
		}

		tlsConfig.ServerName = host
	}

	return d.dialPool(ctx, "hostname:"+address, func(ctx context.Context) (drpc.Conn, *tls.ConnectionState, error) {
		// check for a quic rollout, and if not, force tcp.
		if !checkQUICRolloutState(ctx, storj.NodeID{}) {
			ctx = hyrbidConnectorContextWithForcedKind(ctx, "tcp")
		}
		return d.dialEncryptedConn(ctx, address, tlsConfig)
	})
}

// DialAddressUnencrypted dials to the specified address without tls.
func (d Dialer) DialAddressUnencrypted(ctx context.Context, address string) (_ *Conn, err error) {
	defer mon.Task()(&ctx)(&err)

	// clear out TLS options so that the cache does not include it as part of the key.
	d.TLSOptions = nil

	return d.dialPool(ctx, "unencrypted:"+address, func(ctx context.Context) (drpc.Conn, *tls.ConnectionState, error) {
		// check for a quic rollout, and if not, force tcp.
		if !checkQUICRolloutState(ctx, storj.NodeID{}) {
			ctx = hyrbidConnectorContextWithForcedKind(ctx, "tcp")
		}
		return d.dialUnencryptedConn(ctx, address)
	})
}

//
// dialing helper functions
//

// dialPool dials through the connection pool, reusing a connection if possible based on the
// key and calling the dialer if necessary.
func (d Dialer) dialPool(ctx context.Context, key string, dialer rpcpool.Dialer) (_ *Conn, err error) {
	defer mon.Task()(&ctx)(&err)

	// include the timeout here so that it includes all aspects of the dial
	if d.DialTimeout > 0 {
		var cancel func()
		ctx, cancel = context.WithTimeout(ctx, d.DialTimeout)
		defer cancel()
	}

	conn, state, err := d.Pool.Get(ctx, key, d.TLSOptions, rpcpool.WrapDialer(ctx, dialer))
	if err != nil {
		return nil, errs.Wrap(err)
	}

	// check that the tls connection state has been returned if we were dialing with
	// tls options.
	if state == nil {
		if d.TLSOptions != nil {
			return nil, errs.New("conn transport did not have tls connection state")
		}
		state = &tls.ConnectionState{}
	}

	return &Conn{
		state: *state,
		Conn:  rpctracing.NewTracingWrapper(conn),
	}, nil
}

// dialEncryptedConn performs dialing to the drpc endpoint with tls.
func (d Dialer) dialEncryptedConn(ctx context.Context, address string, tlsConfig *tls.Config) (_ drpc.Conn, _ *tls.ConnectionState, err error) {
	defer mon.Task()(&ctx)(&err)

	if d.DialLatency > 0 {
		timer := time.NewTimer(d.DialLatency)
		select {
		case <-timer.C:
		case <-ctx.Done():
			timer.Stop()
			return nil, nil, Error.Wrap(ctx.Err())
		}
	}

	conn, err := d.Connector.DialContext(ctx, tlsConfig, address)
	if err != nil {
		return nil, nil, Error.Wrap(err)
	}

	state := conn.ConnectionState()
	return drpcconn.NewWithOptions(conn, d.ConnectionOptions), &state, nil
}

type unencryptedConnector interface {
	DialContextUnencrypted(context.Context, string) (net.Conn, error)
}

// dialUnencryptedConn performs dialing to the drpc endpoint with no tls.
func (d Dialer) dialUnencryptedConn(ctx context.Context, address string) (_ drpc.Conn, _ *tls.ConnectionState, err error) {
	defer mon.Task()(&ctx)(&err)

	if d.DialLatency > 0 {
		timer := time.NewTimer(d.DialLatency)
		select {
		case <-timer.C:
		case <-ctx.Done():
			timer.Stop()
			return nil, nil, Error.Wrap(ctx.Err())
		}
	}

	if unencConnector, ok := d.Connector.(unencryptedConnector); ok {
		// open the tcp socket to the address
		conn, err := unencConnector.DialContextUnencrypted(ctx, address)
		if err != nil {
			return nil, nil, Error.Wrap(err)
		}

		return drpcconn.NewWithOptions(conn, d.ConnectionOptions), nil, nil
	}

	return nil, nil, Error.New("unsupported transport type: %T, use TCPTransport", d.Connector)
}
