// Copyright (C) 2021 Storj Labs, Inc.
// See LICENSE for copying information.

package stream

import (
	"context"
	"io"
	"sync"

	"github.com/zeebo/errs"
	"golang.org/x/sync/errgroup"

	"storj.io/common/storj"
	"storj.io/uplink/private/storage/streams"
)

// PartUpload implements Writer and Closer for writing to part.
type PartUpload struct {
	ctx      context.Context
	streams  *streams.Store
	writer   *io.PipeWriter
	errgroup errgroup.Group

	// mu protects closed
	mu     sync.Mutex
	closed bool

	// partmu protects part
	partmu sync.RWMutex
	part   *streams.Part
}

// NewUploadPart creates new part upload.
func NewUploadPart(ctx context.Context, bucket, key string, streamID storj.StreamID, partNumber uint32, etag streams.ETag, streamsStore *streams.Store) *PartUpload {
	reader, writer := io.Pipe()

	upload := PartUpload{
		ctx:     ctx,
		streams: streamsStore,
		writer:  writer,
	}

	upload.errgroup.Go(func() error {
		part, err := streamsStore.PutPart(ctx, bucket, key, streamID, partNumber, etag, reader)
		if err != nil {
			err = Error.Wrap(err)
			return errs.Combine(err, reader.CloseWithError(err))
		}

		upload.partmu.Lock()
		upload.part = &part
		upload.partmu.Unlock()

		return nil
	})

	return &upload
}

// close transitions the upload to being closed and returns an error
// if it is already closed.
func (upload *PartUpload) close() error {
	upload.mu.Lock()
	defer upload.mu.Unlock()

	if upload.closed {
		return Error.New("already closed")
	}

	upload.closed = true
	return nil
}

// isClosed returns true if the upload is already closed.
func (upload *PartUpload) isClosed() bool {
	upload.mu.Lock()
	defer upload.mu.Unlock()

	return upload.closed
}

// Write writes len(data) bytes from data to the underlying data stream.
//
// See io.Writer for more details.
func (upload *PartUpload) Write(data []byte) (n int, err error) {
	if upload.isClosed() {
		return 0, Error.New("already closed")
	}
	return upload.writer.Write(data)
}

// Close closes the stream and releases the underlying resources.
func (upload *PartUpload) Close() error {
	if err := upload.close(); err != nil {
		return err
	}

	// Wait for our launched goroutine to return.
	return errs.Combine(
		upload.writer.Close(),
		upload.errgroup.Wait(),
	)
}

// Abort closes the stream with an error so that it does not successfully commit and
// releases the underlying resources.
func (upload *PartUpload) Abort() error {
	if err := upload.close(); err != nil {
		return err
	}

	// Wait for our launched goroutine to return. We do not need any of the
	// errors from the abort because they will just be things stating that
	// it was aborted.
	_ = upload.writer.CloseWithError(Error.New("aborted"))
	_ = upload.errgroup.Wait()

	return nil
}

// Part returns the part metadata.
//
// Will return nil if the upload is still in progress.
func (upload *PartUpload) Part() *streams.Part {
	upload.partmu.RLock()
	defer upload.partmu.RUnlock()

	// we can safely return the pointer because it doesn't change after the
	// upload finishes
	return upload.part
}
