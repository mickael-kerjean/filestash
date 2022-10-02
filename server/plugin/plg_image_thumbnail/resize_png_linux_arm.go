package plg_image_thumbnail

import (
	_ "embed"
)

//go:embed dist/png_Linux_armv7l.bin
var binaryThumbnailPng []byte
