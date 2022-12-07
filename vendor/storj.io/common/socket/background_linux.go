// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package socket

import (
	"syscall"
)

func setLowPrioCongestionController(fd int) error {
	// temporary behavior until we figure out better scavenger traffic
	return nil
}

func setLowEffortQoS(fd int) error {
	return syscall.SetsockoptByte(fd, syscall.SOL_IP, syscall.IP_TOS, byte(dscpLE)<<2)
}
