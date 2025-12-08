//go:build static
// +build static

package ctrl

import (
	"bytes"
	"compress/gzip"
)

func compressGzip(content []byte, quality int) []byte {
	var buf bytes.Buffer
	gz, err := gzip.NewWriterLevel(&buf, quality)
	if err != nil {
		gz = gzip.NewWriter(&buf)
	}
	_, _ = gz.Write(content)
	gz.Close()
	return buf.Bytes()
}

func compressBr(content []byte, quality int) []byte {
	return []byte("")
}
