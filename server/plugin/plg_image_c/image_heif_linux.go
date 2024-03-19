package plg_image_c

// #include "image_heif.h"
// #cgo LDFLAGS: -lheif
import "C"

func heif(input uintptr, output uintptr, size int) {
	C.heif_to_jpeg(C.int(input), C.int(output), C.int(size))
	return
}
