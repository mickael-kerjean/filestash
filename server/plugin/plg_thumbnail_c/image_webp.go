package plg_image_c

// #include "image_webp.h"
// #cgo LDFLAGS: -l:libwebp.a
import "C"

func webp(input uintptr, output uintptr, size int) {
	C.webp_to_webp(C.int(input), C.int(output), C.int(size))
	return
}
