package services

import (
	"bytes"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/services/images"
	"io"
	"net/http"
	"strconv"
	"strings"
)

func ProcessFileBeforeSend(file io.Reader, ctx *App, req *http.Request, res *http.ResponseWriter) (io.Reader, error) {
	query := req.URL.Query()
	mType := ctx.Helpers.MimeType(query.Get("path"))
	(*res).Header().Set("Content-Type", mType)

	if strings.HasPrefix(mType, "image/") {
		if query.Get("thumbnail") != "true" && query.Get("size") == "" {
			return file, nil
		}
		if mType != "image/jpeg" && mType != "image/png" && mType != "image/gif" && mType != "image/tiff" {
			return file, nil
		}

		transform := &images.Transform{
			Rotate: 0,
			Mirror: false,
			Size:   300,
		}

		file, ex, err := images.ExtractExif(file)
		if err == nil {
			// see: https://www.daveperrett.com/images/articles/2012-07-28-exif-orientation-handling-is-a-ghetto/EXIF_Orientations.jpg
			switch ex.Orientation {
			case "1":
				transform.Rotate = 0
				transform.Mirror = false
			case "2":
				transform.Rotate = 0
				transform.Mirror = true
			case "3":
				transform.Rotate = 180
				transform.Mirror = false
			case "4":
				transform.Rotate = 180
				transform.Mirror = true
			case "5":
				transform.Rotate = 90
				transform.Mirror = true
			case "6":
				transform.Rotate = 90
				transform.Mirror = false
			case "7":
				transform.Rotate = 270
				transform.Mirror = true
			case "8":
				transform.Rotate = 270
				transform.Mirror = false
			}
		}

		if images.IsRaw(mType) {
			mType = "image/jpeg"
			file = bytes.NewReader(ex.Preview)
		}

		if query.Get("thumbnail") == "true" {
			(*res).Header().Set("Cache-Control", "max-age=259200") // 3 days
		} else if query.Get("size") != "" {
			(*res).Header().Set("Cache-Control", "max-age=600")
			size, err := strconv.ParseInt(query.Get("size"), 10, 64)
			if err != nil {
				return file, nil
			}
			transform.Size = int(size)
		}
		return images.CreateThumbnail(transform, file)
	}
	return file, nil
}
