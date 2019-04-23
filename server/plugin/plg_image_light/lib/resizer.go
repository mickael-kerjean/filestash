package lib

// #cgo pkg-config: vips
// #include <resizer.h>
// #include <stdlib.h>
import "C"

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"os"
	"runtime"
	"unsafe"
	"sync"
)

var (
	LIBVIPS_INSTALLED = false
	VIPS_LOCK = &sync.Mutex{}
)

type Transform struct {
	Input     string
	Output    string
	Size      int
	Crop      bool
	Quality   int
	Exif      bool
}

func init() {
	if C.resizer_init(C.int(runtime.NumCPU())) != 0 {
		Log.Warning("Can't load libvips")
		return
	}
	LIBVIPS_INSTALLED = true
}

func CreateThumbnail(t *Transform) (io.ReadCloser, error) {
	if LIBVIPS_INSTALLED == false {
		return nil, NewError("Libvips not installed", 501)
	}
	filenameInput := C.CString(t.Input)
	defer C.free(unsafe.Pointer(filenameInput))

	filenameOutput := C.CString(t.Output)
	defer C.free(unsafe.Pointer(filenameOutput))

	VIPS_LOCK.Lock()
	if C.resizer_process(filenameInput, filenameOutput, C.int(t.Size), boolToCInt(t.Crop), C.int(t.Quality), boolToCInt(t.Exif)) != 0 {
		return nil, NewError("", 500)
	}
	VIPS_LOCK.Unlock()
	return os.OpenFile(t.Output, os.O_RDONLY, os.ModePerm)
}

func boolToCInt(val bool) C.int {
	if val == false {
		return C.int(0)
	}
	return C.int(1)
}
