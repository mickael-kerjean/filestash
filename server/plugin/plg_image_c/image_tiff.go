package plg_image_c

// #include "image_tiff.h"
// #cgo LDFLAGS: -l:libwebp.a -ltiff
import "C"

func tiff(input uintptr, output uintptr, size int) {
	C.tiff_to_webp(C.int(input), C.int(output), C.int(size))
	return
}
