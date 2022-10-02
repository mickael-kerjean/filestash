package plg_image_thumbnail

import (
	"bytes"
	_ "embed"
	"errors"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"os/exec"
)

//go:generate make png

func createThumbnailForPng(reader io.ReadCloser) (io.ReadCloser, error) {
	name := "thumbnail_webp.bin"
	err := setupProgram(name, binaryThumbnailPng)
	if err != nil {
		Log.Warning("plg_image_thumbnail %s")
		reader.Close()
		return nil, err
	}

	var buf bytes.Buffer
	var errBuff bytes.Buffer
	cmd := exec.Command("/tmp/" + name)
	cmd.Stdin = reader
	cmd.Stdout = &buf
	cmd.Stderr = &errBuff
	if err := cmd.Run(); err != nil {
		reader.Close()
		Log.Debug("plg_image_thumbmail::resize_webp ERR %s", string(errBuff.Bytes()))
		return nil, errors.New(string(errBuff.Bytes()))
	}
	cmd.Wait()
	reader.Close()
	return NewReadCloserFromBytes(buf.Bytes()), nil
}
