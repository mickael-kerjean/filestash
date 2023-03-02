package common

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
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

func GetAbsolutePath(base string, opts ...string) string {
	fullPath := base
	if strings.HasPrefix(base, "/") == false { // relative filepath are relative to the binary
		fullPath = filepath.Join(GetCurrentDir(), base)
	}
	if len(opts) == 0 {
		return fullPath
	}
	return filepath.Join(append([]string{fullPath}, opts...)...)
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

func SafeOsMkdir(path string, mode os.FileMode) error {
	if err := safePath(path); err != nil {
		Log.Debug("common::files safeOsMkdir err[%s] path[%s]", err.Error(), path)
		return ErrFilesystemError
	}
	return os.Mkdir(path, mode)
}

func SafeOsRemove(path string) error {
	if err := safePath(path); err != nil {
		Log.Debug("common::files safeOsRemove err[%s] path[%s]", err.Error(), path)
		return ErrFilesystemError
	}
	return os.Remove(path)
}

func SafeOsRemoveAll(path string) error {
	if err := safePath(path); err != nil {
		Log.Debug("common::files safeOsRemoveAll err[%s] path[%s]", err.Error(), path)
		return ErrFilesystemError
	}
	return os.RemoveAll(path)
}

func SafeOsRename(from string, to string) error {
	if err := safePath(from); err != nil {
		Log.Debug("common::files safeOsRename err[%s] from[%s]", err.Error(), from)
		return ErrFilesystemError
	} else if err := safePath(to); err != nil {
		Log.Debug("common::files safeOsRemove err[%s] to[%s]", err.Error(), to)
		return ErrFilesystemError
	}
	return os.Rename(from, to)
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
		Log.Debug("common::files safePath path[%s] p[%s]", path, p)
		return ErrFilesystemError
	}
	return nil
}
