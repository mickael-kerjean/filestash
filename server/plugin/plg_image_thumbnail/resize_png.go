package plg_image_thumbnail

import (
	"io"
)

var exeForPng ThumbnailExecutable = ThumbnailExecutable{
	Name:     "thumbnail_png.bin",
	Binary:   &binaryThumbnailPng,
	Checksum: checksumPng,
}

func init() {
	exeForPng.Init()
}

func createThumbnailForPng(reader io.ReadCloser) (io.ReadCloser, error) {
	return exeForPng.Execute(reader)
}
