package plg_image_golang

import (
	"github.com/h2non/bimg"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"io/ioutil"
	"net/http"
)

const THUMB_SIZE int = 150

func init() {
	Hooks.Register.ProcessFileContentBeforeSend(func(reader io.ReadCloser, ctx *App, res *http.ResponseWriter, req *http.Request) (io.ReadCloser, error) {
		query := req.URL.Query()
		mType := GetMimeType(query.Get("path"))

		if query.Get("thumbnail") != "true" {
			return reader, nil
		} else if mType != "image/jpeg" && mType != "image/png" && mType != "image/gif" {
			return reader, nil
		}

		b, err := ioutil.ReadAll(reader)
		if err != nil {
			return reader, err
		}
		newImage, err := bimg.NewImage(b).Thumbnail(THUMB_SIZE)
		if err != nil {
			return reader, err
		}
		return NewReadCloserFromBytes(newImage), err
	})
}
