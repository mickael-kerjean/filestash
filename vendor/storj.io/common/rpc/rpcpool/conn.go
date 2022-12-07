// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package rpcpool

import (
	"context"
	"sync"

	"github.com/zeebo/errs"

	"storj.io/drpc"
)

// poolConn grabs a connection from the pool for every invoke/stream.
type poolConn struct {
	on sync.Once
	ch chan struct{}

	pk   poolKey
	dial Dialer
	pool *Pool
}

// Close marks the poolConn as closed and will not allow future calls to Invoke or NewStream
// to proceed. It does not stop any ongoing calls to Invoke or NewStream.
func (c *poolConn) Close() (err error) {
	c.on.Do(func() { close(c.ch) })
	return nil
}

// Closed returns true if the poolConn is closed.
func (c *poolConn) Closed() <-chan struct{} {
	return c.ch
}

// Invoke acquires a connection from the pool, dialing if necessary, and issues the Invoke on that
// connection. The connection is replaced into the pool after the invoke finishes.
func (c *poolConn) Invoke(ctx context.Context, rpc string, enc drpc.Encoding, in, out drpc.Message) (err error) {
	defer mon.Task()(&ctx)(&err)

	select {
	case <-c.ch:
		return errs.New("connection closed")
	default:
	}

	pv, err := c.pool.get(ctx, c.pk, c.dial)
	if err != nil {
		return err
	}
	defer c.pool.cache.Put(c.pk, pv)

	return pv.conn.Invoke(ctx, rpc, enc, in, out)
}

// NewStream acquires a connection from the pool, dialing if necessary, and issues the NewStream on
// that connection. The connection is replaced into the pool after the stream is finished.
func (c *poolConn) NewStream(ctx context.Context, rpc string, enc drpc.Encoding) (_ drpc.Stream, err error) {
	defer mon.Task()(&ctx)(&err)

	select {
	case <-c.ch:
		return nil, errs.New("connection closed")
	default:
	}

	pv, err := c.pool.get(ctx, c.pk, c.dial)
	if err != nil {
		return nil, err
	}

	stream, err := pv.conn.NewStream(ctx, rpc, enc)
	if err != nil {
		return nil, err
	}

	// the stream's done channel is closed when we're sure no reads/writes are
	// coming in for that stream anymore. it has been fully terminated.
	go func() {
		<-stream.Context().Done()
		c.pool.cache.Put(c.pk, pv)
	}()

	return stream, nil
}
