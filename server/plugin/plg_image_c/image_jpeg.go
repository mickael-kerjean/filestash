package plg_image_c

// #include "image_jpeg.h"
// #cgo LDFLAGS: -l:libjpeg.a
import "C"

import (
	"fmt"
	"io"
	"os"
)

func JpegToJpeg(input io.ReadCloser) (io.ReadCloser, error) {
	read, write, err := os.Pipe()
	if err != nil {
		return nil, err
	}

	go func() {
		cRead, cWrite, err := os.Pipe()
		if err != nil {
			fmt.Printf("ERR %+v\n", err)
		}
		go func() {
			defer cWrite.Close()
			io.Copy(cWrite, input)
		}()
		cInput := C.fdopen(C.int(cRead.Fd()), C.CString("r"))
		cOutput := C.fdopen(C.int(write.Fd()), C.CString("w"))

		C.jpeg_to_jpeg(cInput, cOutput, 200)

		cWrite.Close()
		write.Close()
		cRead.Close()
	}()

	return read, nil
}
