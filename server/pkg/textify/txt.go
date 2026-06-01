package textify

import (
	"io"
)

func Txt(rc io.ReadCloser) (io.ReadCloser, error) {
	return rc, nil
}
