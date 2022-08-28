package common

import (
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
	fi, err := os.Lstat(filepath.Clean(path))
	if err != nil {
		Log.Warning("common::files os.Open err[%s] path[%s]", err.Error(), path)
		return nil, ErrFilesystemError
	}
	switch mode := fi.Mode(); {
	case mode.IsRegular():
	case mode.IsDir():
	case mode&os.ModeSymlink != 0:
		Log.Warning("common::files blocked symlink path[%s]", path)
		return nil, ErrFilesystemError
	default:
		Log.Warning("common::files mode[%b] path[%s]", mode, path)
		return nil, ErrFilesystemError
	}
	return os.OpenFile(path, flag|syscall.O_NOFOLLOW, perm)
}
