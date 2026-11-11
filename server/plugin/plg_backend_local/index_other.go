//go:build !windows

package plg_backend_local

import (
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func osPath(path string) string {
	return path
}

func fromOSPath(path string) string {
	return path
}

func listDrives() ([]os.FileInfo, error) {
	return nil, ErrNotFound
}
