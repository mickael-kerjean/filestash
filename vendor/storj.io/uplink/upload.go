// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package uplink

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/zeebo/errs"

	"storj.io/common/pb"
	"storj.io/uplink/private/storage/streams"
	"storj.io/uplink/private/stream"
)

// ErrUploadDone is returned when either Abort or Commit has already been called.
var ErrUploadDone = errors.New("upload done")

// UploadOptions contains additional options for uploading.
type UploadOptions struct {
	// When Expires is zero, there is no expiration.
	Expires time.Time
}

// UploadObject starts an upload to the specific key.
func (project *Project) UploadObject(ctx context.Context, bucket, key string, options *UploadOptions) (upload *Upload, err error) {
	defer mon.Task()(&ctx)(&err)

	if bucket == "" {
		return nil, errwrapf("%w (%q)", ErrBucketNameInvalid, bucket)
	}
	if key == "" {
		return nil, errwrapf("%w (%q)", ErrObjectKeyInvalid, key)
	}

	if options == nil {
		options = &UploadOptions{}
	}

	// N.B. we always call dbCleanup which closes the db because
	// closing it earlier has the benefit of returning a connection to
	// the pool, so we try to do that as early as possible.

	db, err := project.dialMetainfoDB(ctx)
	if err != nil {
		return nil, convertKnownErrors(err, bucket, key)
	}
	defer func() { err = errs.Combine(err, db.Close()) }()

	obj, err := db.CreateObject(ctx, bucket, key, nil)
	if err != nil {
		return nil, convertKnownErrors(err, bucket, key)
	}

	info := obj.Info()

	ctx, cancel := context.WithCancel(ctx)

	upload = &Upload{
		cancel: cancel,
		bucket: bucket,
		object: convertObject(&info),
	}

	meta := dynamicMetadata{upload.object}
	mutableStream, err := obj.CreateDynamicStream(ctx, meta, options.Expires)
	if err != nil {
		return nil, convertKnownErrors(err, bucket, key)
	}

	// Return the connection to the pool as soon as we can.
	if err := db.Close(); err != nil {
		return nil, convertKnownErrors(err, bucket, key)
	}

	streams, err := project.getStreamsStore(ctx)
	if err != nil {
		return nil, convertKnownErrors(err, bucket, key)
	}

	upload.streams = streams
	upload.upload = stream.NewUpload(ctx, mutableStream, streams)

	return upload, nil
}

type dynamicMetadata struct{ *Object }

func (dyn dynamicMetadata) Metadata() ([]byte, error) {
	return pb.Marshal(&pb.SerializableMeta{
		UserDefined: dyn.Object.Custom.Clone(),
	})
}

// Upload is an upload to Storj Network.
type Upload struct {
	mu      sync.Mutex
	closed  bool
	aborted bool
	cancel  context.CancelFunc
	upload  *stream.Upload
	bucket  string
	object  *Object
	streams *streams.Store
}

// Info returns the last information about the uploaded object.
func (upload *Upload) Info() *Object {
	meta := upload.upload.Meta()
	if meta != nil {
		upload.object.System.ContentLength = meta.Size
		upload.object.System.Created = meta.Modified
	}
	return upload.object
}

// Write uploads len(p) bytes from p to the object's data stream.
// It returns the number of bytes written from p (0 <= n <= len(p))
// and any error encountered that caused the write to stop early.
func (upload *Upload) Write(p []byte) (n int, err error) {
	n, err = upload.upload.Write(p)
	return n, convertKnownErrors(err, upload.bucket, upload.object.Key)
}

// Commit commits data to the store.
//
// Returns ErrUploadDone when either Abort or Commit has already been called.
func (upload *Upload) Commit() error {
	upload.mu.Lock()
	defer upload.mu.Unlock()

	if upload.aborted {
		return errwrapf("%w: already aborted", ErrUploadDone)
	}

	if upload.closed {
		return errwrapf("%w: already committed", ErrUploadDone)
	}

	upload.closed = true

	err := errs.Combine(
		upload.upload.Close(),
		upload.streams.Close(),
	)

	return convertKnownErrors(err, upload.bucket, upload.object.Key)
}

// Abort aborts the upload.
//
// Returns ErrUploadDone when either Abort or Commit has already been called.
func (upload *Upload) Abort() error {
	upload.mu.Lock()
	defer upload.mu.Unlock()

	if upload.closed {
		return errwrapf("%w: already committed", ErrUploadDone)
	}

	if upload.aborted {
		return errwrapf("%w: already aborted", ErrUploadDone)
	}

	upload.aborted = true
	upload.cancel()

	err := errs.Combine(
		upload.upload.Abort(),
		upload.streams.Close(),
	)

	return convertKnownErrors(err, upload.bucket, upload.object.Key)
}

// SetCustomMetadata updates custom metadata to be included with the object.
// If it is nil, it won't be modified.
func (upload *Upload) SetCustomMetadata(ctx context.Context, custom CustomMetadata) error {
	upload.mu.Lock()
	defer upload.mu.Unlock()

	if upload.aborted {
		return errwrapf("%w: upload aborted", ErrUploadDone)
	}
	if upload.closed {
		return errwrapf("%w: already committed", ErrUploadDone)
	}
	if upload.upload.Meta() != nil {
		return errwrapf("%w: already committed", ErrUploadDone)
	}

	if custom != nil {
		if err := custom.Verify(); err != nil {
			return packageError.Wrap(err)
		}
		upload.object.Custom = custom.Clone()
	}

	return nil
}
