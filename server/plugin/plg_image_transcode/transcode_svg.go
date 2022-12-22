package plg_image_transcode

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/srwiley/oksvg"
	"github.com/srwiley/rasterx"
	"image"
	"image/png"
	"io"
)

/*
 * This bit isn't used because the rendering is very poor and would
 * generate too many bug reports
 */
func transcodeSvg(reader io.Reader) (io.ReadCloser, string, error) {
	icon, err := oksvg.ReadIconStream(reader)
	if err != nil {
		return nil, "", err
	}
	icon.SetTarget(0, 0, icon.ViewBox.W, icon.ViewBox.H)
	width := int(icon.ViewBox.W)
	height := int(icon.ViewBox.H)
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	icon.Draw(
		rasterx.NewDasher(
			width, height,
			rasterx.NewScannerGV(width, height, img, img.Bounds()),
		), 1,
	)

	r, w := io.Pipe()
	go func() {
		err := png.Encode(w, img)
		w.Close()
		if err != nil {
			Log.Debug("plg_image_transcode::svg png encoding error '%s'", err.Error())
		}
	}()
	return NewReadCloserFromReader(r), "image/png", nil
}
