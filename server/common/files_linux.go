package common

import (
	"errors"
	"io/fs"
	"os"
	"syscall"
)

func SafeOsOpenFile(path string, flag int, perm os.FileMode) (*os.File, error) {
	if err := safePath(path); err != nil {
		Log.Debug("common::files safeOsOpenFile err[%s] path[%s]", err.Error(), path)
		return nil, ErrFilesystemError
	}
	f, err := os.OpenFile(path, flag|syscall.O_NOFOLLOW, perm)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, ErrNotFound
		}
		return nil, processError(err)
	}
	return f, err
}
