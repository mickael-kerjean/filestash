package common

import (
	"os"
	"syscall"
)

func SafeOsOpenFile(path string, flag int, perm os.FileMode) (*os.File, error) {
	if err := safePath(path); err != nil {
		Log.Debug("common::files safeOsOpenFile err[%s] path[%s]", err.Error(), path)
		return nil, ErrFilesystemError
	}
	return os.OpenFile(path, flag|syscall.O_NOFOLLOW, perm)
}
