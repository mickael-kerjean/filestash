package plg_image_thumbnail

import (
	_ "embed"
)

//go:embed dist/png_linux_amd64.bin
var binaryThumbnailPng []byte
