// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package testuplink

import (
	"context"

	"storj.io/common/memory"
)

type segmentSizeKey struct{}

type plainSizeKey struct{}

type listLimitKey struct{}

// WithMaxSegmentSize creates context with max segment size for testing purposes.
//
// Created context needs to be used with uplink.OpenProject to manipulate default
// segment size.
func WithMaxSegmentSize(ctx context.Context, segmentSize memory.Size) context.Context {
	return context.WithValue(ctx, segmentSizeKey{}, segmentSize)
}

// GetMaxSegmentSize returns max segment size from context if exists.
func GetMaxSegmentSize(ctx context.Context) (memory.Size, bool) {
	segmentSize, ok := ctx.Value(segmentSizeKey{}).(memory.Size)
	return segmentSize, ok
}

// WithoutPlainSize creates context with information that segment plain size shouldn't be sent.
// Only for testing purposes.
func WithoutPlainSize(ctx context.Context) context.Context {
	return context.WithValue(ctx, plainSizeKey{}, true)
}

// IsWithoutPlainSize returns true if information about not sending segment plain size exists in context.
// Only for testing purposes.
func IsWithoutPlainSize(ctx context.Context) bool {
	withoutPlainSize, _ := ctx.Value(plainSizeKey{}).(bool)
	return withoutPlainSize
}

// WithListLimit creates context with information about list limit that will be used with request.
// Only for testing purposes.
func WithListLimit(ctx context.Context, limit int) context.Context {
	return context.WithValue(ctx, listLimitKey{}, limit)
}

// GetListLimit returns value for list limit if exists in context.
// Only for testing purposes.
func GetListLimit(ctx context.Context) int {
	limit, _ := ctx.Value(listLimitKey{}).(int)
	return limit
}
