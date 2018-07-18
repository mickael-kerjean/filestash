package images

import (
	"bytes"
	"github.com/davidbyttow/govips/pkg/vips"
	"image"
	"image/jpeg"
	"io"
)

type Transform struct {
	Rotate int
	Mirror bool
	Size   int
}

func CreateThumbnail(t *Transform, file io.Reader) (io.Reader, error) {
	if obj, ok := file.(interface{ Close() error }); ok {
		defer obj.Close()
	}

	if t.Size > 3000 {
		t.Size = 3000
	}
	v := vips.NewTransform().Load(file).ResizeWidth(t.Size)
	quality := 80
	if t.Size > 1000 {
		quality = 90
	}
	v = v.Quality(quality)

	if t.Rotate != 0 {
		switch t.Rotate {
		case 90:
			v = v.Rotate(vips.Angle90)
		case 180:
			v = v.Rotate(vips.Angle180)
		case 270:
			v.Rotate(vips.Angle270)
		}
	}
	if t.Mirror == true {
		v = v.Flip(vips.FlipHorizontal)
	}

	b, _, err := v.Apply()

	if err != nil {
		return bytes.NewReader(b), err
	}
	return bytes.NewReader(b), nil
}

func readerToBuffer(r io.Reader) *bytes.Buffer {
	buf := new(bytes.Buffer)
	buf.ReadFrom(r)
	return buf
}

func imageToReader(img image.Image) (io.Reader, error) {
	buf := new(bytes.Buffer)
	err := jpeg.Encode(buf, img, &jpeg.Options{Quality: 50})
	if err != nil {
		return buf, err
	}
	return buf, nil
}
