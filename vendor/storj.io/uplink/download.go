// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package uplink

import (
	"context"

	"github.com/zeebo/errs"

	"storj.io/uplink/private/metaclient"
	"storj.io/uplink/private/storage/streams"
	"storj.io/uplink/private/stream"
)

// DownloadOptions contains additional options for downloading.
type DownloadOptions struct {
	// When Offset is negative it will read the suffix of the blob.
	// Combining negative offset and positive length is not supported.
	Offset int64
	// When Length is negative it will read until the end of the blob.
	Length int64
}

// DownloadObject starts a download from the specific key.
func (project *Project) DownloadObject(ctx context.Context, bucket, key string, options *DownloadOptions) (download *Download, err error) {
	defer mon.Task()(&ctx)(&err)

	if bucket == "" {
		return nil, errwrapf("%w (%q)", ErrBucketNameInvalid, bucket)
	}
	if key == "" {
		return nil, errwrapf("%w (%q)", ErrObjectKeyInvalid, key)
	}

	var opts metaclient.DownloadOptions
	switch {
	case options == nil:
		opts.Range = metaclient.StreamRange{
			Mode: metaclient.StreamRangeAll,
		}
	case options.Offset < 0:
		if options.Length >= 0 {
			return nil, packageError.New("suffix requires length to be negative, got %v", options.Length)
		}
		opts.Range = metaclient.StreamRange{
			Mode:   metaclient.StreamRangeSuffix,
			Suffix: -options.Offset,
		}
	case options.Length < 0:
		opts.Range = metaclient.StreamRange{
			Mode:  metaclient.StreamRangeStart,
			Start: options.Offset,
		}

	default:
		opts.Range = metaclient.StreamRange{
			Mode:  metaclient.StreamRangeStartLimit,
			Start: options.Offset,
			Limit: options.Offset + options.Length,
		}
	}

	// N.B. we always call dbCleanup which closes the db because
	// closing it earlier has the benefit of returning a connection to
	// the pool, so we try to do that as early as possible.

	db, err := project.dialMetainfoDB(ctx)
	if err != nil {
		return nil, convertKnownErrors(err, bucket, key)
	}
	defer func() { err = errs.Combine(err, db.Close()) }()

	// TODO: handle DownloadObject & downloadInfo.ListSegments.More in the same location.
	//       currently this code is rather disjoint.

	objectDownload, err := db.DownloadObject(ctx, bucket, key, opts)
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

	streamRange := objectDownload.Range
	return &Download{
		streams:  streams,
		download: stream.NewDownloadRange(ctx, objectDownload, streams, streamRange.Start, streamRange.Limit-streamRange.Start),
		bucket:   bucket,
		object:   convertObject(&objectDownload.Object),
	}, nil
}

// Download is a download from Storj Network.
type Download struct {
	download *stream.Download
	object   *Object
	bucket   string
	streams  *streams.Store
}

// Info returns the last information about the object.
func (download *Download) Info() *Object {
	return download.object
}

// Read downloads up to len(p) bytes into p from the object's data stream.
// It returns the number of bytes read (0 <= n <= len(p)) and any error encountered.
func (download *Download) Read(p []byte) (n int, err error) {
	n, err = download.download.Read(p)
	return n, convertKnownErrors(err, download.bucket, download.object.Key)
}

// Close closes the reader of the download.
func (download *Download) Close() error {
	err := errs.Combine(
		download.download.Close(),
		download.streams.Close(),
	)
	return convertKnownErrors(err, download.bucket, download.object.Key)
}
