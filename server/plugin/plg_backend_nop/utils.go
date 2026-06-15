package plg_backend_nop

import (
	"io"
	"strconv"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

type LargeFile struct {
	Counter int64
}

func (this *LargeFile) Read(p []byte) (n int, err error) {
	if this.Counter <= 0 {
		return 0, io.EOF
	}
	this.Counter = this.Counter - int64(len(p))
	lenp := len(p)
	if lenp > 0 {
		p[0] = '_'
	}
	for i := 0; i < lenp; i += 100 {
		p[i] = '_'
	}
	return lenp, nil
}

func (this LargeFile) Close() error {
	return nil
}

func getSize(path string) (int64, error) {
	path = strings.TrimPrefix(path, "/")
	if strings.HasSuffix(path, ".bin") == false {
		return 0, ErrNotImplemented
	}
	path = strings.TrimSuffix(path, ".bin")
	order := 1
	if strings.HasSuffix(path, "K") {
		path = strings.TrimSuffix(path, "K")
		order = order * 1024
	} else if strings.HasSuffix(path, "M") {
		path = strings.TrimSuffix(path, "M")
		order = order * 1024 * 1024
	} else if strings.HasSuffix(path, "G") {
		path = strings.TrimSuffix(path, "G")
		order = order * 1024 * 1024 * 1024
	}
	i, err := strconv.Atoi(path)
	if err != nil {
		return 0, ErrNotImplemented
	}
	return int64(i) * int64(order), nil
}
