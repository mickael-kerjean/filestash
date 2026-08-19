package system

import (
	"os"
	"runtime"
)

func GenerateMachineID() string {
	if runtime.GOOS == "linux" {
		if f, err := os.OpenFile("/etc/machine-id", os.O_RDONLY, os.ModePerm); err == nil {
			defer f.Close()
			b := make([]byte, 32)
			if _, err = f.Read(b); err == nil {
				return string(b)
			}
		} else if f, err := os.OpenFile("/var/lib/dbus/machine-id", os.O_RDONLY, os.ModePerm); err == nil {
			defer f.Close()
			b := make([]byte, 32)
			if _, err = f.Read(b); err == nil {
				return string(b)
			}
		}
	}
	return "na"
}
