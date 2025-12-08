//go:build !static
// +build !static

package ctrl

import (
	"github.com/google/brotli/go/cbrotli"
)

func compressGzip(content []byte, quality int) []byte {
	return []byte{}
}

func compressBr(content []byte, quality int) []byte {
	out, _ := cbrotli.Encode(content, cbrotli.WriterOptions{Quality: quality})
	return out
}
