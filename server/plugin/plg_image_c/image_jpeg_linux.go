package plg_image_c

// #include "image_jpeg.h"
// #cgo LDFLAGS: -ljpeg
import "C"

func jpeg(input uintptr, output uintptr, size int) {
	C.jpeg_to_jpeg(C.int(input), C.int(output), C.int(size))
	return
}
