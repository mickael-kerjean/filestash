package formater

import (
	"io"
)

func TxtFormater(rc io.ReadCloser) (io.ReadCloser, error) {
	return rc, nil
}
