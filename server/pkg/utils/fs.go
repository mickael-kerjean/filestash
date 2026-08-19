package utils

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
)

func SafeOsOpenFile(path string, flag int, perm os.FileMode) (*os.File, error) {
	if err := safePath(path); err != nil {
		return nil, ErrFilesystemError
	}
	if runtime.GOOS == "linux" {
		flag |= 0x20000 // O_NOFOLLOW ref:/usr/include/asm-generic/fcntl.h
	}
	f, err := os.OpenFile(path, flag, perm)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, ErrNotFound
		}
		return nil, processError(err)
	}
	return f, err
}

func SafeOsMkdir(path string, mode os.FileMode) error {
	if err := safePath(path); err != nil {
		return ErrFilesystemError
	}
	return processError(os.Mkdir(path, mode))
}

func SafeOsRemove(path string) error {
	if err := safePath(path); err != nil {
		return ErrFilesystemError
	}
	return processError(os.Remove(path))
}

func SafeOsRemoveAll(path string) error {
	if err := safePath(path); err != nil {
		return ErrFilesystemError
	}
	return processError(os.RemoveAll(path))
}

func SafeOsRename(from string, to string) error {
	if err := safePath(from); err != nil {
		return ErrFilesystemError
	} else if err := safePath(to); err != nil {
		return ErrFilesystemError
	}
	return processError(os.Rename(from, to))
}

func processError(err error) error {
	if err == nil {
		return nil
	}
	if pe, ok := err.(*os.PathError); ok {
		return pe.Err
	}
	if le, ok := err.(*os.LinkError); ok {
		return le.Err
	}
	return err
}

func safePath(path string) error {
	p, err := filepath.EvalSymlinks(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) == false {
			return err
		}
		parentPath := filepath.Join(path, "../")
		return safePath(parentPath)
	}
	if p != filepath.Clean(path) {
		return ErrFilesystemError
	}
	return nil
}
