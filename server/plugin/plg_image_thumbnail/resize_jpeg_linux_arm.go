package plg_image_thumbnail

import (
	_ "embed"
)

//go:embed dist/jpeg_Linux_armv7l.bin
var binaryThumbnailJpeg []byte
