// +build !linux

package common

import (
	"os"
)

func SafeOsOpenFile(path string, flag int, perm os.FileMode) (*os.File, error) {
	if err := safePath(path); err != nil {
		Log.Debug("common::files safeOsOpenFile err[%s] path[%s]", err.Error(), path)
		return nil, ErrFilesystemError
	}
	return os.OpenFile(path, flag, perm)
}
