// Copyright (C) 2021 Storj Labs, Inc.
// See LICENSE for copying information.

package drpcopts

import "storj.io/drpc"

// Stream contains internal options for the drpcstream package.
type Stream struct {
	transport drpc.Transport
	term      chan<- struct{}
}

// GetStreamTransport returns the drpc.Transport stored in the options.
func GetStreamTransport(opts *Stream) drpc.Transport { return opts.transport }

// SetStreamTransport sets the drpc.Transport stored in the options.
func SetStreamTransport(opts *Stream, tr drpc.Transport) { opts.transport = tr }

// GetStreamTerm returns the chan<- struct{} stored in the options.
func GetStreamTerm(opts *Stream) chan<- struct{} { return opts.term }

// SetStreamTerm sets the chan<- struct{} stored in the options.
func SetStreamTerm(opts *Stream, term chan<- struct{}) { opts.term = term }
