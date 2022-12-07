// Copyright (C) 2019 Storj Labs, Inc.
// See LICENSE for copying information.

package drpcstream

import (
	"sync"
)

type packetBuffer struct {
	mu   sync.Mutex
	cond sync.Cond
	err  error
	data []byte
	set  bool
}

func (pb *packetBuffer) init() {
	pb.cond.L = &pb.mu
}

func (pb *packetBuffer) Close(err error) {
	pb.mu.Lock()
	defer pb.mu.Unlock()

	if pb.err == nil {
		pb.err = err
		pb.data = nil
		pb.set = false
		pb.cond.Broadcast()
	}
}

func (pb *packetBuffer) Put(data []byte) {
	pb.mu.Lock()
	defer pb.mu.Unlock()

	pb.data = data
	pb.set = true
	pb.cond.Broadcast()

	for pb.set && pb.err == nil {
		pb.cond.Wait()
	}
}

func (pb *packetBuffer) Get() ([]byte, error) {
	pb.mu.Lock()
	defer pb.mu.Unlock()

	for !pb.set && pb.err == nil {
		pb.cond.Wait()
	}

	return pb.data, pb.err
}

func (pb *packetBuffer) Done() {
	pb.mu.Lock()
	defer pb.mu.Unlock()

	pb.data = nil
	pb.set = false
	pb.cond.Broadcast()
}
