package plg_image_thumbnail

import (
	_ "embed"
)

//go:embed dist/jpeg_linux_arm.bin
var binaryThumbnailJpeg []byte
