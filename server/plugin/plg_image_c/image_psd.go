//go:generate go run image_psd_generator.go

package plg_image_c

// #include "image_psd.h"
// #cgo LDFLAGS: -lwebp
import "C"

func psd(input uintptr, output uintptr, size int) {
	C.psd_to_webp(C.int(input), C.int(output), C.int(size))
	return
}
