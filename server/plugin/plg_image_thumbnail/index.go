package plg_image_thumbnail

import (
	"bytes"
	_ "embed"
	"errors"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"net/http"
	"os"
)

//go:embed dist/placeholder.png
var placeholder []byte

func init() {
	Hooks.Register.Thumbnailer("image/png", thumbnailBuilder{thumbnailPng})
	Hooks.Register.Thumbnailer("image/jpeg", thumbnailBuilder{thumbnailJpeg})
}

func thumbnailPng(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	h := (*res).Header()
	r, err := createThumbnailForPng(reader)
	if err != nil {
		h.Set("Content-Type", "image/png")
		h.Set("Cache-Control", "max-age=1")
		return NewReadCloserFromBytes(placeholder), nil
	}
	h.Set("Content-Type", "image/webp")
	h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
	return r, nil
}

func thumbnailJpeg(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	h := (*res).Header()
	r, err := createThumbnailForJpeg(reader)
	if err != nil {
		h.Set("Content-Type", "image/png")
		return NewReadCloserFromBytes(placeholder), nil
	}
	h.Set("Content-Type", "image/jpeg")
	h.Set("Cache-Control", fmt.Sprintf("max-age=%d", 3600*12))
	return r, nil
}

type thumbnailBuilder struct {
	fn func(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error)
}

func (this thumbnailBuilder) Generate(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	return this.fn(reader, ctx, res, req)
}

func setupProgram(name string, raw []byte) error {
	p := "/tmp/" + name
	f, err := os.OpenFile(p, os.O_RDONLY, os.ModePerm)
	if err != nil {
		outFile, err := os.OpenFile(p, os.O_CREATE|os.O_WRONLY, os.ModePerm)
		if err != nil {
			return err
		}
		outFile.Write(raw)
		if err = outFile.Close(); err != nil {
			return err
		}
		f, err = os.OpenFile(p, os.O_RDONLY, os.ModePerm)
		if err != nil {
			return err
		}
	}
	b := make([]byte, 5)
	n, err := f.Read(b)
	if err != nil {
		f.Close()
		return err
	} else if n != 5 {
		f.Close()
		return errors.New("unexpected read")
	} else if bytes.Equal(b, raw[:5]) == false {
		f.Close()
		return errors.New("different data")
	}
	return f.Close()
}
