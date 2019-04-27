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
	"unsafe"
)

var VIPS_LOCK = semaphore.NewWeighted(int64(10))

func CreateThumbnail(t *Transform) (io.ReadCloser, error) {
	VIPS_LOCK.Acquire(context.Background(), 1)
	defer VIPS_LOCK.Release(1)
	
	filename := C.CString(t.Input)
	defer C.free(unsafe.Pointer(filename))
	var buffer unsafe.Pointer
	len := C.size_t(0)
	if C.image_resize(filename, &buffer, &len, C.int(t.Size), boolToCInt(t.Crop), C.int(t.Quality), boolToCInt(t.Exif)) != 0 {
		return nil, NewError("", 500)
	}
	buf := C.GoBytes(buffer, C.int(len))
	C.g_free(C.gpointer(buffer))	
	return NewReadCloserFromBytes(buf), nil
}

func boolToCInt(val bool) C.int {
	if val == false {
		return C.int(0)
	}
	return C.int(1)
}
