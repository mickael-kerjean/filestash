//go:build !linux

package plg_backend_local

import (
	"io"
	"os"
)

func NewDirect(f *os.File, fs os.FileInfo) io.ReadCloser {
	return f
}
