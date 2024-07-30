package plg_image_c

// #include "image_jpeg.h"
// #cgo LDFLAGS: -L /usr/local/lib -L /usr/lib -L /lib -l:libjpeg.a
// #cgo CFLAGS: -I /usr/local/include
import "C"

func jpeg(input uintptr, output uintptr, size int) {
	C.jpeg_to_jpeg(C.int(input), C.int(output), C.int(size))
	return
}
