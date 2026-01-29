//go:build cgo

package compress

import (
	"github.com/google/brotli/go/cbrotli"
)

func Gzip(content []byte, quality int) []byte {
	return []byte{}
}

func Br(content []byte, quality int) []byte {
	out, _ := cbrotli.Encode(content, cbrotli.WriterOptions{Quality: quality})
	return out
}
