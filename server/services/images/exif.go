package images

import (
	"bytes"
	"github.com/rwcarlsen/goexif/exif"
	"io"
	"io/ioutil"
	"log"
)

type ExifMeta struct {
	Orientation string
	Preview     []byte
}

func ExtractExif(file io.Reader) (io.Reader, *ExifMeta, error) {
	meta := &ExifMeta{}
	buf, err := ioutil.ReadAll(file)
	if err != nil {
		return bytes.NewReader(buf), nil, err
	}

	x, err := exif.Decode(bytes.NewReader(buf))

	if err != nil {
		log.Println("0")
		return bytes.NewReader(buf), meta, err
	}
	o, err := x.Get(exif.Orientation)
	if err != nil {
		return bytes.NewReader(buf), meta, err
	}
	meta.Preview, _ = x.JpegThumbnail()
	meta.Orientation = o.String()
	return bytes.NewReader(buf), meta, nil
}
