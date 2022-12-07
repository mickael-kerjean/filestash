// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

// +build !linux
// +build !darwin
// +build !windows

package socket

func setLowPrioCongestionController(fd int) error { return nil }

func setLowEffortQoS(fd int) error { return nil }
