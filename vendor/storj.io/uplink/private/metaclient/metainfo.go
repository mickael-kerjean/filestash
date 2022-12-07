// Copyright (C) 2019 Storj Labs, Inc.
// See LICENSE for copying information.

package metaclient

import (
	"context"

	"github.com/zeebo/errs"

	"storj.io/common/encryption"
)

var errClass = errs.Class("metainfo")

// DB implements metainfo database.
type DB struct {
	metainfo *Client

	encStore *encryption.Store
}

// New creates a new metainfo database.
func New(metainfo *Client, encStore *encryption.Store) *DB {
	return &DB{
		metainfo: metainfo,
		encStore: encStore,
	}
}

// Close closes the underlying resources passed to the metainfo DB.
func (db *DB) Close() error {
	return db.metainfo.Close()
}

// CreateBucket creates a new bucket with the specified information.
func (db *DB) CreateBucket(ctx context.Context, bucketName string) (newBucket Bucket, err error) {
	defer mon.Task()(&ctx)(&err)

	if bucketName == "" {
		return Bucket{}, ErrNoBucket.New("")
	}

	newBucket, err = db.metainfo.CreateBucket(ctx, CreateBucketParams{
		Name: []byte(bucketName),
	})
	return newBucket, ErrBucket.Wrap(err)
}

// DeleteBucket deletes bucket.
func (db *DB) DeleteBucket(ctx context.Context, bucketName string, deleteAll bool) (bucket Bucket, err error) {
	defer mon.Task()(&ctx)(&err)

	if bucketName == "" {
		return Bucket{}, ErrNoBucket.New("")
	}

	bucket, err = db.metainfo.DeleteBucket(ctx, DeleteBucketParams{
		Name:      []byte(bucketName),
		DeleteAll: deleteAll,
	})
	return bucket, ErrBucket.Wrap(err)
}

// GetBucket gets bucket information.
func (db *DB) GetBucket(ctx context.Context, bucketName string) (bucket Bucket, err error) {
	defer mon.Task()(&ctx)(&err)

	if bucketName == "" {
		return Bucket{}, ErrNoBucket.New("")
	}

	bucket, err = db.metainfo.GetBucket(ctx, GetBucketParams{
		Name: []byte(bucketName),
	})
	return bucket, ErrBucket.Wrap(err)
}

// ListBuckets lists buckets.
func (db *DB) ListBuckets(ctx context.Context, options BucketListOptions) (bucketList BucketList, err error) {
	defer mon.Task()(&ctx)(&err)

	bucketList, err = db.metainfo.ListBuckets(ctx, ListBucketsParams{
		ListOpts: options,
	})
	return bucketList, ErrBucket.Wrap(err)
}
