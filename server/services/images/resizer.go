package images

// #cgo pkg-config: vips
// #include <resizer.h>
// #include <stdlib.h>
import "C"

import (
	"bytes"
	. "github.com/mickael-kerjean/nuage/server/common"
	"io"
	"log"
	"runtime"
	"unsafe"
)

var LIBVIPS_INSTALLED = false

type Transform struct {
	Temporary string
	Size      int
	Crop      bool
	Quality   int
	Exif      bool
}

func init() {
	if C.resizer_init(C.int(runtime.NumCPU()), 50, 1024) != 0 {
		log.Println("WARNING Can't load libvips")
		return
	}
	LIBVIPS_INSTALLED = true
}

func CreateThumbnail(t *Transform) (io.Reader, error) {
	if LIBVIPS_INSTALLED == false {
		return nil, NewError("Libvips not installed", 501)
	}
	filename := C.CString(t.Temporary)
	defer C.free(unsafe.Pointer(filename))
	var buffer unsafe.Pointer
	len := C.size_t(0)

	if C.resizer_process(filename, &buffer, &len, C.int(t.Size), boolToCInt(t.Crop), C.int(t.Quality), boolToCInt(t.Exif)) != 0 {
		return nil, NewError("", 500)
	}
	buf := C.GoBytes(buffer, C.int(len))
	C.g_free(C.gpointer(buffer))
	return bytes.NewReader(buf), nil
}

func boolToCInt(val bool) C.int {
	if val == false {
		return C.int(0)
	}
	return C.int(1)
}
