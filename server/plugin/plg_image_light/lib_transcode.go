package plg_image_light
// #cgo CFLAGS: -I./deps/src
// #include "libtranscode.h"
import "C"

import (
	"context"
	"golang.org/x/sync/semaphore"
	. "github.com/mickael-kerjean/filestash/server/common"
	"time"
	"unsafe"
)

const (
	TRANSCODE_TIMEOUT        = 10 * time.Second
	TRANSCODE_MAX_CONCURRENT = 5
)

var LIBRAW_LOCK = semaphore.NewWeighted(int64(TRANSCODE_MAX_CONCURRENT))

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
	ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(TRANSCODE_TIMEOUT))
	defer cancel()
	
	if err := LIBRAW_LOCK.Acquire(ctx, 1); err != nil {
		return ErrCongestion
	}
	defer LIBRAW_LOCK.Release(1)

	transcodeChannel := make(chan error, 1)
	go func() {
		filename := C.CString(t.Input)
		defer C.free(unsafe.Pointer(filename))
		if err := C.image_transcode_compute(filename, C.int(t.Size)); err != 0 {
			transcodeChannel <- ErrNotValid
		}
		transcodeChannel <- nil
	}()

	select {
	case err := <- transcodeChannel:
		return err
	case <- ctx.Done():
		return ErrTimeout		
	}
}
