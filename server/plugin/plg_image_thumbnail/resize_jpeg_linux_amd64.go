package plg_image_thumbnail

import (
	_ "embed"
)

//go:embed dist/jpeg_Linux_x86_64.bin
var binaryThumbnailJpeg []byte
