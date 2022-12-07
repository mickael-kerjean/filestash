// Copyright (C) 2019 Storj Labs, Inc.
// See LICENSE for copying information.

package piecestore

import (
	"context"
	"errors"
	"io"
	"time"

	"github.com/zeebo/errs"

	"storj.io/common/identity"
	"storj.io/common/memory"
	"storj.io/common/pb"
	"storj.io/common/rpc"
	"storj.io/common/storj"
)

var errMessageTimeout = errors.New("message timeout")

var (
	// Error is the default error class for piecestore client.
	Error = errs.Class("piecestore")

	// CloseError is the error class used for errors generated during a
	// stream close in a piecestore client.
	//
	// Errors of this type should also be wrapped with Error, for backwards
	// compatibility.
	CloseError = errs.Class("piecestore close")
)

// Config defines piecestore client parameters for upload and download.
type Config struct {
	DownloadBufferSize int64

	InitialStep int64
	MaximumStep int64

	MessageTimeout time.Duration
}

// DefaultConfig are the default params used for upload and download.
var DefaultConfig = Config{
	DownloadBufferSize: 256 * memory.KiB.Int64(),

	InitialStep: 64 * memory.KiB.Int64(),
	MaximumStep: 256 * memory.KiB.Int64(),

	MessageTimeout: 10 * time.Minute,
}

// Client implements uploading, downloading and deleting content from a piecestore.
type Client struct {
	client pb.DRPCPiecestoreClient
	conn   *rpc.Conn
	config Config
}

// Dial dials the target piecestore endpoint.
func Dial(ctx context.Context, dialer rpc.Dialer, nodeURL storj.NodeURL, config Config) (*Client, error) {
	conn, err := dialer.DialNodeURL(ctx, nodeURL)
	if err != nil {
		return nil, Error.Wrap(err)
	}

	return &Client{
		client: pb.NewDRPCPiecestoreClient(conn),
		conn:   conn,
		config: config,
	}, nil
}

// Retain uses a bloom filter to tell the piece store which pieces to keep.
func (client *Client) Retain(ctx context.Context, req *pb.RetainRequest) (err error) {
	defer mon.Task()(&ctx)(&err)
	_, err = client.client.Retain(ctx, req)
	return Error.Wrap(err)
}

// Close closes the underlying connection.
func (client *Client) Close() error {
	return client.conn.Close()
}

// GetPeerIdentity gets the connection's peer identity.
func (client *Client) GetPeerIdentity() (*identity.PeerIdentity, error) {
	return client.conn.PeerIdentity()
}

// next allocation step find the next trusted step.
func (client *Client) nextAllocationStep(previous int64) int64 {
	// TODO: ensure that this is frame idependent
	next := previous * 3 / 2
	if next > client.config.MaximumStep {
		next = client.config.MaximumStep
	}
	return next
}

// ignoreEOF is an utility func for ignoring EOF error, when it's not important.
func ignoreEOF(err error) error {
	if errors.Is(err, io.EOF) {
		return nil
	}
	return err
}
