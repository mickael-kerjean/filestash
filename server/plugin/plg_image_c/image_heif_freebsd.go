package plg_image_c

// #include "image_heif.h"
// #cgo LDFLAGS: -L /usr/local/lib -L /usr/lib -L /lib -lheif
// #cgo CFLAGS: -I /usr/local/include
import "C"

func heif(input uintptr, output uintptr, size int) {
	C.heif_to_jpeg(C.int(input), C.int(output), C.int(size))
	return
}
