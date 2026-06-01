package libav

// #cgo pkg-config: libavformat libavcodec libavfilter libavutil libswscale libswresample
// #include <stdlib.h>
// #include "transcode.h"
import "C"

import (
	"context"
	"fmt"
	"io"
	"runtime/cgo"
	"unsafe"
)

func init() {
	C.ff_set_log_quiet()
}

//export goWriteCallback
func goWriteCallback(handle C.uintptr_t, buf *C.uint8_t, n C.int) C.int {
	if w, ok := cgo.Handle(handle).Value().(io.Writer); !ok {
		return -1
	} else if _, err := w.Write(C.GoBytes(unsafe.Pointer(buf), n)); err != nil {
		return -1
	}
	return n
}

//export goInterruptCallback
func goInterruptCallback(handle C.uintptr_t) C.int {
	if ctx, ok := cgo.Handle(handle).Value().(context.Context); ok && ctx.Err() != nil {
		return 1
	}
	return 0
}

func transcodeSegment(ctx context.Context, cachePath string, segmentNumber int, w io.Writer) (err error) {
	h := cgo.NewHandle(w)
	hctx := cgo.NewHandle(ctx)
	req := C.FFRequest{
		path:          C.CString(cachePath),
		encoder:       C.CString(ENCODER),
		start_sec:     C.int(segmentNumber * HLS_SEGMENT_LENGTH),
		end_sec:       C.int((segmentNumber + 1) * HLS_SEGMENT_LENGTH),
		segment_len:   C.int(HLS_SEGMENT_LENGTH),
		max_height:    C.int(VIDEO_MAX_HEIGHT),
		audio_bitrate: C.int(AUDIO_BITRATE),
		errbuf:        (*C.char)(C.malloc(512)), errlen: 512,
		interrupt: C.uintptr_t(hctx),
	}

	if ret := C.ff_transcode_segment(&req, C.uintptr_t(h)); ret < 0 && ctx.Err() == nil {
		err = fmt.Errorf("%s", C.GoString(req.errbuf))
	}

	C.free(unsafe.Pointer(req.path))
	C.free(unsafe.Pointer(req.encoder))
	C.free(unsafe.Pointer(req.errbuf))
	h.Delete()
	hctx.Delete()
	return err
}

func probeDuration(path string) (float64, error) {
	cPath := C.CString(path)
	defer C.free(unsafe.Pointer(cPath))

	var out C.double
	var errbuf [256]C.char
	if ret := C.ff_probe_duration(cPath, &out, &errbuf[0], C.int(len(errbuf))); ret < 0 {
		return 0, fmt.Errorf("%s", C.GoString(&errbuf[0]))
	}
	return float64(out), nil
}
