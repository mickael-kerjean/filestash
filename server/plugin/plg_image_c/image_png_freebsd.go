package plg_image_c

// #include "image_png.h"
// #cgo LDFLAGS: -L /usr/local/lib -L /usr/lib -L /lib -l:libsharpyuv.a -l:libpng.a -l:libz.a -l:libwebp.a -l:libpthread.a -fopenmp
// #cgo CFLAGS: -I /usr/local/include
import "C"

func png(input uintptr, output uintptr, size int) {
	C.png_to_webp(C.int(input), C.int(output), C.int(size))
	return
}
