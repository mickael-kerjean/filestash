package plg_image_golang

import (
	"bytes"
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/image/draw"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	"image/png"

	"io"
	"net/http"
)

const THUMB_SIZE int = 400

func init() {
	Hooks.Register.Thumbnailer("image/jpeg", thumbnailer{})
	Hooks.Register.Thumbnailer("image/png", thumbnailer{})
	Hooks.Register.Thumbnailer("image/gif", thumbnailer{})
}

type thumbnailer struct{}

func (this thumbnailer) Generate(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	query := req.URL.Query()
	mType := GetMimeType(query.Get("path"))

	if query.Get("thumbnail") != "true" {
		return reader, nil
	} else if mType != "image/jpeg" && mType != "image/png" && mType != "image/gif" {
		return reader, nil
	}

	src, _, err := image.Decode(reader)
	if err != nil {
		return reader, nil
	}
	ratio := func(i image.Image) int {
		b := src.Bounds()
		max := b.Max.X
		if b.Max.X < b.Max.Y {
			max = b.Max.Y
		}
		r := max / THUMB_SIZE
		if r <= 1 {
			return 1
		}
		return r
	}(src)

	dst := image.NewRGBA(image.Rect(0, 0, src.Bounds().Max.X/ratio, src.Bounds().Max.Y/ratio))
	draw.ApproxBiLinear.Scale(dst, dst.Rect, src, src.Bounds(), draw.Over, nil)
	output := bytes.NewBuffer([]byte(""))
	if err = png.Encode(output, dst); err != nil {
		return reader, err
	}
	return NewReadCloserFromBytes(output.Bytes()), nil
}
