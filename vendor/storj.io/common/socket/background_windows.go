// Copyright (C) 2020 Storj Labs, Inc.
// See LICENSE for copying information.

package socket

func setLowPrioCongestionController(fd int) error {
	// TODO: Evidently some Windowses come with LEDBAT? A hint:
	// https://deploymentresearch.com/setup-low-extra-delay-background-transport-ledbat-for-configmgr/
	return nil
}

func setLowEffortQoS(fd int) error {
	// TODO
	return nil
}
