package plg_image_c

// #include "image_png.h"
// #cgo LDFLAGS: -l:libpng.a -l:libz.a -l:libwebp.a -lpthread -lm
import "C"

import (
	"fmt"
	"io"
	"os"
)

func PngToWebp(input io.ReadCloser) (io.ReadCloser, error) {
	read, write, err := os.Pipe()
	if err != nil {
		fmt.Printf("OS PIPE ERR %+v\n", err)
		return nil, err
	}

	go func() {
		cRead, cWrite, err := os.Pipe()
		if err != nil {
			fmt.Printf("ERR %+v\n", err)
			return
		}
		go func() {
			defer cWrite.Close()
			io.Copy(cWrite, input)
		}()
		cInput := C.fdopen(C.int(cRead.Fd()), C.CString("r"))
		cOutput := C.fdopen(C.int(write.Fd()), C.CString("w"))

		C.png_to_webp(cInput, cOutput, 300)

		cWrite.Close()
		write.Close()
		cRead.Close()
	}()

	return read, nil
}
