// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package rpc

import (
	"context"
	"crypto/tls"
	"net"
	"time"

	"github.com/zeebo/errs"

	"storj.io/common/memory"
	"storj.io/common/netutil"
	"storj.io/drpc/drpcmigrate"
)

// ConnectorConn is a type that creates a connection and establishes a tls
// session.
type ConnectorConn interface {
	net.Conn
	ConnectionState() tls.ConnectionState
}

// Connector is a type that creates a ConnectorConn, given an address and
// a tls configuration.
type Connector interface {
	// DialContext is called to establish a encrypted connection using tls.
	DialContext(ctx context.Context, tlsconfig *tls.Config, address string) (ConnectorConn, error)
}

// ConnectorAdapter represents a dialer that can establish a net.Conn.
type ConnectorAdapter struct {
	DialContext func(ctx context.Context, network, address string) (net.Conn, error)
}

// TCPConnector implements a dialer that creates an encrypted connection using tls.
type TCPConnector struct {
	// TCPUserTimeout controls what setting to use for the TCP_USER_TIMEOUT
	// socket option on dialed connections. Only valid on linux. Only set
	// if positive.
	TCPUserTimeout time.Duration

	// TransferRate limits all read/write operations to go slower than
	// the size per second if it is non-zero.
	TransferRate memory.Size

	// SendDRPCMuxHeader caused the connector to send a preamble after TCP handshake
	// but before the TLS handshake.
	// This was used to migrate from gRPC to DRPC.
	// This needs to be false when connecting through a TLS termination proxy.
	SendDRPCMuxHeader bool

	dialer *ConnectorAdapter
}

// NewDefaultTCPConnector creates a new TCPConnector instance with provided tcp dialer.
// If no dialer is predefined, net.Dialer is used by default.
//
// Deprecated: Use NewHybridConnector wherever possible instead.
func NewDefaultTCPConnector(dialer *ConnectorAdapter) TCPConnector {
	if dialer == nil {
		dialer = &ConnectorAdapter{
			DialContext: new(net.Dialer).DialContext,
		}
	}

	return TCPConnector{
		TCPUserTimeout:    15 * time.Minute,
		SendDRPCMuxHeader: true,
		dialer:            dialer,
	}
}

// DialContext creates a encrypted tcp connection using tls.
func (t TCPConnector) DialContext(ctx context.Context, tlsConfig *tls.Config, address string) (_ ConnectorConn, err error) {
	defer mon.Task()(&ctx)(&err)

	rawConn, err := t.DialContextUnencrypted(ctx, address)
	if err != nil {
		return nil, Error.Wrap(err)
	}

	// perform the handshake racing with the context closing. we use a buffer
	// of size 1 so that the handshake can proceed even if no one is reading.
	errCh := make(chan error, 1)
	conn := tls.Client(rawConn, tlsConfig)
	go func() { errCh <- conn.Handshake() }()

	// see which wins and close the raw conn if there was any error. we can't
	// close the tls connection concurrently with handshakes or it sometimes
	// will panic. cool, huh?
	select {
	case <-ctx.Done():
		err = ctx.Err()
	case err = <-errCh:
	}
	if err != nil {
		_ = rawConn.Close()
		return nil, Error.Wrap(err)
	}

	return &tlsConnWrapper{
		Conn:       conn,
		underlying: rawConn,
	}, nil
}

// DialContextUnencrypted creates a raw tcp connection.
func (t TCPConnector) DialContextUnencrypted(ctx context.Context, address string) (_ net.Conn, err error) {
	defer mon.Task()(&ctx)(&err)

	conn, err := t.dialer.DialContext(ctx, "tcp", address)
	if err != nil {
		return nil, Error.Wrap(err)
	}

	if tcpconn, ok := conn.(*net.TCPConn); t.TCPUserTimeout > 0 && ok {
		if err := netutil.SetUserTimeout(tcpconn, t.TCPUserTimeout); err != nil {
			return nil, errs.Combine(Error.Wrap(err), Error.Wrap(conn.Close()))
		}
	}

	if t.SendDRPCMuxHeader {
		conn = drpcmigrate.NewHeaderConn(conn, drpcmigrate.DRPCHeader)
	}

	return &timedConn{
		Conn: netutil.TrackClose(conn),
		rate: t.TransferRate,
	}, nil
}

// SetTransferRate sets the transfer rate member for this TCPConnector
// instance. This is mainly provided for interface compatibility with other
// connectors.
func (t *TCPConnector) SetTransferRate(rate memory.Size) {
	t.TransferRate = rate
}

// SetSendDRPCMuxHeader says whether we should send the DRPC mux header.
func (t *TCPConnector) SetSendDRPCMuxHeader(send bool) {
	t.SendDRPCMuxHeader = send
}
