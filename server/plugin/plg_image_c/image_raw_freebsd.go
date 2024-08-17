package plg_image_c

// #include "image_raw.h"
// #cgo LDFLAGS: -L /usr/local/lib -L /usr/lib -L /lib -l:libyuv.a -l:libjpeg.a -l:libraw.a -fopenmp -l:libc++.a -llcms2 -lm
// #cgo CFLAGS: -I /usr/local/include
import "C"

func raw(input uintptr, output uintptr, size int) {
	C.raw_to_jpeg(C.int(input), C.int(output), C.int(size))
	return
}
