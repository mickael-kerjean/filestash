package plg_image_c

// #include "image_gif.h"
// #cgo LDFLAGS: -l:libgif.a -l:libwebp.a
import "C"

func gif(input uintptr, output uintptr, size int) {
	C.gif_to_webp(C.int(input), C.int(output), C.int(size))
	return
}
