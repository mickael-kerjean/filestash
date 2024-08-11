package plg_image_c

// #include "image_psd.h"
// #cgo LDFLAGS: -l:libwebp.a
import "C"

func psd(input uintptr, output uintptr, size int) {
	C.psd_to_webp(C.int(input), C.int(output), C.int(size))
	return
}
