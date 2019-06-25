package plg_image_light
// #cgo pkg-config:glib-2.0
// #cgo CFLAGS: -I./deps/src
// #cgo LDFLAGS: -lm -lgmodule-2.0 -lgobject-2.0 -lglib-2.0 -ldl -L./deps -l:libresize.a
// #include "libresize.h"
import "C"

import (
	"context"
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/sync/semaphore"
	"io"
	"time"
	"unsafe"
)

const (
	THUMBNAIL_TIMEOUT        = 5 * time.Second
	THUMBNAIL_MAX_CONCURRENT = 50
)

var VIPS_LOCK = semaphore.NewWeighted(THUMBNAIL_MAX_CONCURRENT)

func CreateThumbnail(t *Transform) (io.ReadCloser, error) {
	ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(THUMBNAIL_TIMEOUT))
	defer cancel()
	if err := VIPS_LOCK.Acquire(ctx, 1); err != nil {
		return nil, ErrCongestion
	}
	defer VIPS_LOCK.Release(1)

	imageChannel := make(chan io.ReadCloser, 1)
	go func() {
		filename := C.CString(t.Input)
		len := C.size_t(0)
		var buffer unsafe.Pointer
		if C.image_resize(filename, &buffer, &len, C.int(t.Size), boolToCInt(t.Crop), C.int(t.Quality), boolToCInt(t.Exif)) != 0 {
			C.free(unsafe.Pointer(filename))
			imageChannel <- nil
			return
		}
		C.free(unsafe.Pointer(filename))
		buf := C.GoBytes(buffer, C.int(len))
		C.g_free(C.gpointer(buffer))
		imageChannel <- NewReadCloserFromBytes(buf)
	}()

	select {
	case img := <- imageChannel:
		if img == nil {
			return nil, ErrNotValid
		}
		return img, nil
	case <- ctx.Done():
		return nil, ErrTimeout
	}
}

func boolToCInt(val bool) C.int {
	if val == false {
		return C.int(0)
	}
	return C.int(1)
}
