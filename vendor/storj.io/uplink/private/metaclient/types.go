// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package metaclient

import (
	"time"

	"storj.io/common/storj"
)

// RawObjectItem represents raw object item from get request.
type RawObjectItem struct {
	Version            uint32
	Bucket             string
	EncryptedObjectKey []byte

	StreamID storj.StreamID

	Created  time.Time
	Modified time.Time
	Expires  time.Time

	PlainSize int64

	EncryptedMetadataNonce        storj.Nonce
	EncryptedMetadataEncryptedKey []byte
	EncryptedMetadata             []byte

	EncryptionParameters storj.EncryptionParameters
	RedundancyScheme     storj.RedundancyScheme
}

// RawObjectListItem represents raw object item from list objects request.
type RawObjectListItem struct {
	EncryptedObjectKey            []byte
	Version                       int32
	Status                        int32
	CreatedAt                     time.Time
	StatusAt                      time.Time
	ExpiresAt                     time.Time
	PlainSize                     int64
	EncryptedMetadataNonce        storj.Nonce
	EncryptedMetadataEncryptedKey []byte
	EncryptedMetadata             []byte
	StreamID                      storj.StreamID
	IsPrefix                      bool
}

// SegmentPosition segment position in object.
type SegmentPosition = storj.SegmentPosition

// SegmentDownloadResponseInfo represents segment download information inline/remote.
type SegmentDownloadResponseInfo struct {
	SegmentID           storj.SegmentID
	EncryptedSize       int64
	EncryptedInlineData []byte
	Next                SegmentPosition
	Position            SegmentPosition
	PiecePrivateKey     storj.PiecePrivateKey

	SegmentEncryption SegmentEncryption
}

// SegmentEncryption represents segment encryption key and nonce.
type SegmentEncryption = storj.SegmentEncryption

var (
	// ErrNoPath is an error class for using empty path.
	ErrNoPath = storj.ErrNoPath

	// ErrObjectNotFound is an error class for non-existing object.
	ErrObjectNotFound = storj.ErrObjectNotFound
)

// Object contains information about a specific object.
type Object = storj.Object

// ObjectInfo contains information about a specific object.
type ObjectInfo = storj.ObjectInfo

// Stream is information about an object stream.
type Stream = storj.Stream

// LastSegment contains info about last segment.
type LastSegment = storj.LastSegment

var (
	// ErrBucket is an error class for general bucket errors.
	ErrBucket = storj.ErrBucket

	// ErrNoBucket is an error class for using empty bucket name.
	ErrNoBucket = storj.ErrNoBucket

	// ErrBucketNotFound is an error class for non-existing bucket.
	ErrBucketNotFound = storj.ErrBucketNotFound
)

// Bucket contains information about a specific bucket.
type Bucket = storj.Bucket

// ListDirection specifies listing direction.
type ListDirection = storj.ListDirection

const (
	// Before lists backwards from cursor, without cursor [NOT SUPPORTED].
	Before = storj.Before
	// Backward lists backwards from cursor, including cursor [NOT SUPPORTED].
	Backward = storj.Backward
	// Forward lists forwards from cursor, including cursor.
	Forward = storj.Forward
	// After lists forwards from cursor, without cursor.
	After = storj.After
)

// ListOptions lists objects.
type ListOptions struct {
	Prefix                storj.Path
	Cursor                storj.Path // Cursor is relative to Prefix, full path is Prefix + Cursor
	Delimiter             rune
	Recursive             bool
	Direction             ListDirection
	Limit                 int
	IncludeCustomMetadata bool
	IncludeSystemMetadata bool
	Status                int32
}

// NextPage returns options for listing the next page.
func (opts ListOptions) NextPage(list ObjectList) ListOptions {
	if !list.More || len(list.Items) == 0 {
		return ListOptions{}
	}

	return ListOptions{
		Prefix:                opts.Prefix,
		Cursor:                list.Items[len(list.Items)-1].Path,
		Delimiter:             opts.Delimiter,
		Recursive:             opts.Recursive,
		IncludeSystemMetadata: opts.IncludeSystemMetadata,
		IncludeCustomMetadata: opts.IncludeCustomMetadata,
		Direction:             After,
		Limit:                 opts.Limit,
	}
}

// ObjectList is a list of objects.
type ObjectList = storj.ObjectList

// BucketListOptions lists objects.
type BucketListOptions = storj.BucketListOptions

// BucketList is a list of buckets.
type BucketList = storj.BucketList
