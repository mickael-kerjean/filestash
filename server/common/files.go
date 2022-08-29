package common

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"syscall"
)

var MOCK_CURRENT_DIR string

func GetCurrentDir() string {
	if MOCK_CURRENT_DIR != "" {
		return MOCK_CURRENT_DIR
	}
	if os.Getenv("WORK_DIR") != "" {
		return os.Getenv("WORK_DIR")
	}
	ex, _ := os.Executable()
	return filepath.Dir(ex)
}

func GetAbsolutePath(p string) string {
	return filepath.Join(GetCurrentDir(), p)
}

func IsDirectory(path string) bool {
	if path == "" {
		return false
	}
	if path[len(path)-1:] != "/" {
		return false
	}
	return true
}

/*
 * Join 2 path together, result has a file
 */
func JoinPath(base, file string) string {
	filePath := filepath.Join(base, file)
	if strings.HasPrefix(filePath, base) == false {
		return base
	}
	return filePath
}

func EnforceDirectory(path string) string {
	if path == "" {
		return "/"
	} else if path[len(path)-1:] == "/" {
		return path
	}
	return path + "/"
}

func SplitPath(path string) (root string, filename string) {
	if path == "" {
		path = "/"
	}
	if IsDirectory(path) == false {
		filename = filepath.Base(path)
	}
	if root = strings.TrimSuffix(path, filename); root == "" {
		root = "/"
	}
	return root, filename
}

func SafeOsOpenFile(path string, flag int, perm os.FileMode) (*os.File, error) {
	flag = flag | syscall.O_NOFOLLOW

	p, err := filepath.EvalSymlinks(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) && flag&os.O_CREATE != 0 {
			return os.OpenFile(path, flag, perm)
		}
		Log.Warning("common::files SafeOsOpenFile err[%s] path[%s]", err.Error(), path)
		return nil, ErrFilesystemError
	}

	if p != filepath.Clean(path) {
		Log.Warning("common::files SafeOsOpenFile clean(path)[%s] p[%s]", filepath.Clean(path), p)
		return nil, ErrFilesystemError
	}

	return os.OpenFile(path, flag, perm)
}
