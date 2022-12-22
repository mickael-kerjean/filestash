package plg_image_transcode

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	_ "golang.org/x/image/bmp"
	"image"
	"image/jpeg"
	"io"
)

func transcodeBmp(reader io.Reader) (io.ReadCloser, string, error) {
	img, _, err := image.Decode(reader)
	if err != nil {
		return nil, "", err
	}

	r, w := io.Pipe()
	go func() {
		err := jpeg.Encode(w, img, &jpeg.Options{Quality: 80})
		w.Close()
		if err != nil {
			Log.Debug("plg_image_transcode::bmp jpeg encoding error '%s'", err.Error())
		}
	}()
	return NewReadCloserFromReader(r), "image/jpeg", nil
}
