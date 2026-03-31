package plg_image_c

// #include "image_raw.h"
// #cgo LDFLAGS: -ljpeg -lraw -fopenmp -lstdc++ -llcms2 -lm
import "C"

func raw(input uintptr, output uintptr, size int) {
	C.raw_to_jpeg(C.int(input), C.int(output), C.int(size))
	return
}
