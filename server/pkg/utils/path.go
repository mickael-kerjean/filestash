package utils

import (
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/bmatcuk/doublestar/v4"
)

var MOCK_CURRENT_DIR string

func GetCurrentDir() string {
	if MOCK_CURRENT_DIR != "" {
		return MOCK_CURRENT_DIR
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
	filePath := path.Join(base, file)
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

func GlobMatch(pattern, name string) bool {
	m, _ := doublestar.Match(pattern, name)
	return m
}
