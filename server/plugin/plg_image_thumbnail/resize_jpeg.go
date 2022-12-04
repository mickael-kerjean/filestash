package plg_image_thumbnail

import (
	"io"
)

var exeForJpeg ThumbnailExecutable = ThumbnailExecutable{
	Name:     "thumbnail_jpeg.bin",
	Binary:   &binaryThumbnailJpeg,
	Checksum: checksumJpeg,
}

func init() {
	exeForJpeg.Init()
}

func createThumbnailForJpeg(reader io.ReadCloser) (io.ReadCloser, error) {
	return exeForJpeg.Execute(reader)
}
