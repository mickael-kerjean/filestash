package plg_image_c

// #include "image_png.h"
// #cgo LDFLAGS: -lpng -lz -lwebp -fopenmp
import "C"

func png(input uintptr, output uintptr, size int) {
	C.png_to_webp(C.int(input), C.int(output), C.int(size))
	return
}
