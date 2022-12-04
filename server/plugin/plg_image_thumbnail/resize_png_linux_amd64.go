package plg_image_thumbnail

import (
	_ "embed"
)

//go:embed dist/png_linux_amd64.bin
var binaryThumbnailPng []byte

//go:embed dist/png_linux_amd64.bin.sha256
var checksumPng []byte
