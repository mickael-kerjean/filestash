package common

import (
	"os"
	"path/filepath"
	"strings"
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

func JoinPath(base, file string) (string, error) {
	filePath := filepath.Join(base, file)

	if strings.HasPrefix(filePath, base) == false {
		return "", ErrNotValid
	}
	return filePath, nil
}
