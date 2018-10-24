package common

import (
	"os"
	"path/filepath"
)

func GetCurrentDir() string {
	ex, _ := os.Executable()
	return filepath.Dir(ex)
}

func GetAbsolutePath(p string) string {
	return filepath.Join(GetCurrentDir(), p)
}

func IsDirectory(path string) bool {
	if string(path[len(path)-1]) != "/" {
		return false
	}
	return true
}
