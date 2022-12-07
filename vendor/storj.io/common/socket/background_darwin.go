// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package socket

func setLowPrioCongestionController(fd int) error {
	// TODO: https://stackoverflow.com/questions/8532372/how-to-load-a-different-congestion-control-algorithm-in-mac-os-x
	return nil
}

func setLowEffortQoS(fd int) error {
	// TODO
	return nil
}
