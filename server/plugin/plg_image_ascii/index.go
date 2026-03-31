package plg_image_ascii

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/qeesung/image2ascii/convert"
	"image"
	"io"
	"net/http"
	"strings"
)

func init() {
	Hooks.Register.ProcessFileContentBeforeSend(func(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, bool, error) {
		value, isIn := req.URL.Query()["ascii"]
		if isIn == false {
			return reader, false, nil
		} else if strings.Join(value, "") == "false" {
			return reader, false, nil
		}

		img, _, err := image.Decode(reader)
		reader.Close()
		if err != nil {
			return NewReadCloserFromBytes([]byte("")), true, err
		}
		opt := convert.DefaultOptions
		opt.FixedWidth = 80
		opt.FixedHeight = 40
		out := convert.NewImageConverter().Image2ASCIIString(img, &opt)
		(*res).Header().Set("Content-Type", "application/octet-stream")
		return NewReadCloserFromBytes([]byte(out)), true, nil
	})
}
