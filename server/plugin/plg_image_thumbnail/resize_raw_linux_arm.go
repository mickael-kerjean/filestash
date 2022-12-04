package plg_image_thumbnail

import (
	_ "embed"
)

//go:embed dist/raw_linux_arm.bin
var binaryThumbnailRaw []byte

//go:embed dist/raw_linux_arm.bin.sha256
var checksumRaw []byte
