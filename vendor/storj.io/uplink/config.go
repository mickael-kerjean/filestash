// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package uplink

import (
	"context"
	"net"
	"time"

	"storj.io/common/rpc"
	"storj.io/common/rpc/rpcpool"
	"storj.io/common/socket"
	"storj.io/common/useragent"
)

const defaultDialTimeout = 10 * time.Second

// Config defines configuration for using uplink library.
type Config struct {
	// UserAgent defines a registered partner's Value Attribution Code, and is used by the satellite to associate
	// a bucket with the partner at the time of bucket creation.
	// See https://docs.storj.io/dcs/how-tos/configure-tools-for-the-partner-program for info on the Partner Program.
	// UserAgent should follow https://tools.ietf.org/html/rfc7231#section-5.5.3.
	UserAgent string

	// DialTimeout defines how long client should wait for establishing
	// a connection to peers.
	// No explicit value or 0 means default 10s will be used. Value lower than 0 means there is no timeout.
	DialTimeout time.Duration

	// DialContext is how sockets are opened and is called to establish
	// a connection. If DialContext is nil, it'll try to use an implementation with background congestion control.
	DialContext func(ctx context.Context, network, address string) (net.Conn, error)

	pool      *rpcpool.Pool
	connector rpc.Connector

	// maximumBufferSize is used to set the maximum buffer size for DRPC
	// connections/streams.
	maximumBufferSize int
}

// getDialer returns a new rpc.Dialer corresponding to the config.
//
// NB: this is used with linkname in internal/expose.
// It needs to be updated when this is updated.
func (config Config) getDialer(ctx context.Context) (_ rpc.Dialer, err error) {
	tlsOptions, err := getProcessTLSOptions(ctx)
	if err != nil {
		return rpc.Dialer{}, packageError.Wrap(err)
	}

	dialer := rpc.NewDefaultDialer(tlsOptions)
	if config.pool != nil {
		dialer.Pool = config.pool
	} else {
		dialer.Pool = rpc.NewDefaultConnectionPool()
	}

	dialer.DialTimeout = config.DialTimeout

	if config.connector != nil {
		dialer.Connector = config.connector
	} else if config.DialContext != nil {
		// N.B.: It is okay to use NewDefaultTCPConnector here because we explicitly don't want
		// NewHybridConnector. NewHybridConnector would not be able to use the user-provided
		// DialContext.
		//lint:ignore SA1019 deprecated okay,
		//nolint:staticcheck // deprecated okay.
		dialer.Connector = rpc.NewDefaultTCPConnector(&rpc.ConnectorAdapter{DialContext: config.DialContext})
	} else {
		connector := rpc.NewHybridConnector()
		// N.B.: It is okay to use NewDefaultTCPConnector here because we are using it
		// within the above hybrid connector. Perhaps we should remove the deprecation
		// status since this seems like a pretty natural usage.
		//lint:ignore SA1019 deprecated okay,
		//nolint:staticcheck // deprecated okay.
		tcpConnector := rpc.NewDefaultTCPConnector(
			&rpc.ConnectorAdapter{
				DialContext: socket.BackgroundDialer().DialContext,
			})
		connector.AddCandidateConnector("tcp", tcpConnector, rpc.TCPConnectorPriority)
		dialer.Connector = connector
	}

	dialer.ConnectionOptions.Manager.Stream.MaximumBufferSize = config.maximumBufferSize

	return dialer, nil
}

// setConnectionPool exposes setting connection pool.
//
// NB: this is used with linkname in internal/expose.
// It needs to be updated when this is updated.
//
//lint:ignore U1000, used with linkname
//nolint: unused
func (config *Config) setConnectionPool(pool *rpcpool.Pool) { config.pool = pool }

// setConnector exposes setting a connector used by the dialer.
//
// NB: this is used with linkname in internal/expose.
// It needs to be updated when this is updated.
//
//lint:ignore U1000, used with linkname
//nolint: unused
func (config *Config) setConnector(connector rpc.Connector) {
	config.connector = connector
}

// setMaximumBufferSize exposes setting maximumBufferSize.
//
// NB: this is used with linkname in internal/expose.
// It needs to be updated when this is updated.
//
//lint:ignore U1000, used with linkname
//nolint: unused
func (config *Config) setMaximumBufferSize(maximumBufferSize int) {
	config.maximumBufferSize = maximumBufferSize
}

func (config Config) validateUserAgent(ctx context.Context) error {
	if len(config.UserAgent) == 0 {
		return nil
	}

	if _, err := useragent.ParseEntries([]byte(config.UserAgent)); err != nil {
		return err
	}

	return nil
}
