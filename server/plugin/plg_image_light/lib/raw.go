package lib

// #cgo pkg-config: libraw
// #include <raw.h>
// #include <stdlib.h>
import "C"

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"math/rand"
	"time"
	"unsafe"
)

const LIBRAW_MEMORY_ERROR = -1

func IsRaw(mType string) bool {
	switch mType {
	case "image/x-tif":
	case "image/x-canon-cr2":
	case "image/x-canon-crw":
	case "image/x-nikon-nef":
	case "image/x-nikon-nrw":
	case "image/x-sony-arw":
	case "image/x-sony-sr2":
	case "image/x-minolta-mrw":
	case "image/x-minolta-mdc":
	case "image/x-olympus-orf":
	case "image/x-panasonic-rw2":
	case "image/x-pentax-pef":
	case "image/x-epson-erf":
	case "image/x-raw":
	case "image/x-x3f":
	case "image/x-fuji-raf":
	case "image/x-aptus-mos":
	case "image/x-mamiya-mef":
	case "image/x-hasselblad-3fr":
	case "image/x-adobe-dng":
	case "image/x-samsung-srw":
	case "image/x-kodak-kdc":
	case "image/x-kodak-dcr":
	default:
		return false
	}
	return true
}

func ExtractPreview(t *Transform) error {
	filename := C.CString(t.Temporary)
	err := C.raw_process(filename, C.int(t.Size))
	if err == LIBRAW_MEMORY_ERROR {
		// libraw acts weird sometimes and I couldn't
		// find a way to increase its available memory :(
		r := rand.Intn(2000) + 500
		time.Sleep(time.Duration(r) * time.Millisecond)
		C.free(unsafe.Pointer(filename))
		return ExtractPreview(t)
	} else if err != 0 {
		C.free(unsafe.Pointer(filename))
		return NewError("", 500)
	}

	C.free(unsafe.Pointer(filename))
	return nil
}
