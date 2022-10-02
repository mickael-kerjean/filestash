package plg_image_thumbnail

import (
	_ "embed"
)

//go:embed dist/png_Linux_x86_64.bin
var binaryThumbnailPng []byte
