// Copyright (C) 2019 Storj Labs, Inc.
// See LICENSE for copying information.

package storj

// SegmentPosition the segment position within its parent object.
// It is an identifier for the segment.
type SegmentPosition struct {
	// PartNumber indicates the ordinal of the part within an object.
	// A part contains one or more segments.
	// PartNumber is defined by the user.
	// This is only relevant for multipart objects.
	// A non-multipart object only has one Part, and its number is 0.
	PartNumber int32
	// Index indicates the ordinal of this segment within a part.
	// Index is managed by Uplink.
	// It is zero-indexed within each part.
	Index int32
}

// SegmentListItem represents listed segment.
type SegmentListItem struct {
	Position SegmentPosition
}

// SegmentDownloadInfo represents segment download information inline/remote.
type SegmentDownloadInfo struct {
	SegmentID           SegmentID
	Size                int64
	EncryptedInlineData []byte
	Next                SegmentPosition
	Position            SegmentPosition
	PiecePrivateKey     PiecePrivateKey

	SegmentEncryption SegmentEncryption
}

// SegmentEncryption represents segment encryption key and nonce.
type SegmentEncryption struct {
	EncryptedKeyNonce Nonce
	EncryptedKey      EncryptedPrivateKey
}
