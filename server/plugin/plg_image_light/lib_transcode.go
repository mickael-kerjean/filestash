package plg_image_light
// #cgo CFLAGS: -I./deps/src
// #cgo LDFLAGS: -lm -lgomp -llcms2 -lstdc++ -L./deps -l:libtranscode.a
// #include "libtranscode.h"
import "C"

import (
	"context"
	"golang.org/x/sync/semaphore"
	. "github.com/mickael-kerjean/filestash/server/common"
	"unsafe"
)

var LIBRAW_LOCK = semaphore.NewWeighted(int64(5))

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
	LIBRAW_LOCK.Acquire(context.Background(), 1)
	defer LIBRAW_LOCK.Release(1)

	filename := C.CString(t.Input)
	defer C.free(unsafe.Pointer(filename))

	if err := C.image_transcode_compute(filename, C.int(t.Size)); err != 0 {
		return ErrNotValid
	}
	return nil
}
