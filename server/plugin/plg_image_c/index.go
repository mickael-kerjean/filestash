package plg_image_c

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"net/http"
)

func init() {
	Hooks.Register.Thumbnailer("image/jpeg", thumbnailer{JpegToJpeg, "image/jpeg"})
	Hooks.Register.Thumbnailer("image/png", thumbnailer{PngToWebp, "image/webp"})
	// Hooks.Register.Thumbnailer("image/png", thumbnailer{PngToWebp, "image/webp"})
}

type thumbnailer struct {
	fn   func(input io.ReadCloser) (io.ReadCloser, error)
	mime string
}

func (this thumbnailer) Generate(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
	thumb, err := this.fn(reader)
	if err == nil && this.mime != "" {
		(*res).Header().Set("Content-Type", this.mime)
	}
	return thumb, err
}
