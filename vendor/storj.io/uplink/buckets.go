// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package uplink

import (
	"context"

	"github.com/zeebo/errs"

	"storj.io/uplink/private/metaclient"
)

// ListBucketsOptions defines bucket listing options.
type ListBucketsOptions struct {
	// Cursor sets the starting position of the iterator. The first item listed will be the one after the cursor.
	Cursor string
}

// ListBuckets returns an iterator over the buckets.
func (project *Project) ListBuckets(ctx context.Context, options *ListBucketsOptions) *BucketIterator {
	defer mon.Task()(&ctx)(nil)

	opts := metaclient.BucketListOptions{
		Direction: metaclient.After,
	}

	if options != nil {
		opts.Cursor = options.Cursor
	}

	buckets := BucketIterator{
		ctx:     ctx,
		project: project,
		options: opts,
	}

	return &buckets
}

// BucketIterator is an iterator over a collection of buckets.
type BucketIterator struct {
	ctx       context.Context
	project   *Project
	options   metaclient.BucketListOptions
	list      *metaclient.BucketList
	position  int
	completed bool
	err       error
}

// Next prepares next Bucket for reading.
// It returns false if the end of the iteration is reached and there are no more buckets, or if there is an error.
func (buckets *BucketIterator) Next() bool {
	if buckets.err != nil {
		buckets.completed = true
		return false
	}

	if buckets.list == nil {
		more := buckets.loadNext()
		buckets.completed = !more
		return more
	}

	if buckets.position >= len(buckets.list.Items)-1 {
		if !buckets.list.More {
			buckets.completed = true
			return false
		}
		more := buckets.loadNext()
		buckets.completed = !more
		return more
	}

	buckets.position++

	return true
}

func (buckets *BucketIterator) loadNext() bool {
	ok, err := buckets.tryLoadNext()
	if err != nil {
		buckets.err = convertKnownErrors(err, "", "")
		return false
	}
	return ok
}

func (buckets *BucketIterator) tryLoadNext() (ok bool, err error) {
	db, err := buckets.project.dialMetainfoDB(buckets.ctx)
	if err != nil {
		return false, err
	}
	defer func() { err = errs.Combine(err, db.Close()) }()

	list, err := db.ListBuckets(buckets.ctx, buckets.options)
	if err != nil {
		return false, err
	}
	buckets.list = &list
	if list.More {
		buckets.options = buckets.options.NextPage(list)
	}
	buckets.position = 0
	return len(list.Items) > 0, nil
}

// Err returns error, if one happened during iteration.
func (buckets *BucketIterator) Err() error {
	return packageError.Wrap(buckets.err)
}

// Item returns the current bucket in the iterator.
func (buckets *BucketIterator) Item() *Bucket {
	item := buckets.item()
	if item == nil {
		return nil
	}
	return &Bucket{
		Name:    item.Name,
		Created: item.Created,
	}
}

func (buckets *BucketIterator) item() *metaclient.Bucket {
	if buckets.completed {
		return nil
	}

	if buckets.err != nil {
		return nil
	}

	if buckets.list == nil {
		return nil
	}

	if len(buckets.list.Items) == 0 {
		return nil
	}

	return &buckets.list.Items[buckets.position]
}
