package plg_image_thumbnail

import (
	_ "embed"
)

//go:embed dist/png_linux_arm.bin
var binaryThumbnailPng []byte
