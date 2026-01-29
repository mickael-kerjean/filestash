//go:build !cgo || windows

package compress

import (
	"bytes"
	"compress/gzip"
)

func Gzip(content []byte, quality int) []byte {
	var buf bytes.Buffer
	gz, err := gzip.NewWriterLevel(&buf, quality)
	if err != nil {
		gz = gzip.NewWriter(&buf)
	}
	_, _ = gz.Write(content)
	gz.Close()
	return buf.Bytes()
}

func Br(content []byte, quality int) []byte {
	return []byte("")
}
