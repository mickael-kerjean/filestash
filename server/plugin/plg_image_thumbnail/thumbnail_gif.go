package plg_image_thumbnail

import (
	"bytes"
	_ "embed"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
)

func createThumbnailForGif(reader io.ReadCloser) (io.ReadCloser, error) {
	//read the file into a buffer
	buf := new(bytes.Buffer)
	buf.ReadFrom(reader)
	reader.Close()
	return NewReadCloserFromBytes(buf.Bytes()), nil
}
