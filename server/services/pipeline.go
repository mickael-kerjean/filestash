package services

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/services/images"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	ImageCachePath = "data/cache/image/"
)

var Letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

func init() {
	cachePath := filepath.Join(GetCurrentDir(), ImageCachePath)
	os.RemoveAll(cachePath)
	os.MkdirAll(cachePath, os.ModePerm)
}

func ProcessFileBeforeSend(reader io.Reader, ctx *App, req *http.Request, res *http.ResponseWriter) (io.Reader, error) {
	query := req.URL.Query()
	mType := ctx.Helpers.MimeType(query.Get("path"))
	(*res).Header().Set("Content-Type", mType)

	if strings.HasPrefix(mType, "image/") {
		if query.Get("thumbnail") != "true" && query.Get("size") == "" {
			return reader, nil
		}

		/////////////////////////
		// Specify transformation
		transform := &images.Transform{
			Temporary: ctx.Helpers.AbsolutePath(ImageCachePath + "image_" + RandomString(10)),
			Size:      300,
			Crop:      true,
			Quality:   50,
			Exif:      false,
		}
		if query.Get("thumbnail") == "true" {
			(*res).Header().Set("Cache-Control", "max-age=259200")
		} else if query.Get("size") != "" {
			(*res).Header().Set("Cache-Control", "max-age=600")
			size, err := strconv.ParseInt(query.Get("size"), 10, 64)
			if err != nil {
				return reader, nil
			}
			transform.Size = int(size)
			transform.Crop = false
			transform.Quality = 90
			transform.Exif = true
		}

		/////////////////////////////
		// Insert file in the fs
		// => lower RAM usage while processing
		file, err := os.OpenFile(transform.Temporary, os.O_WRONLY|os.O_CREATE, os.ModePerm)
		if err != nil {
			return reader, NewError("Can't use filesystem", 500)
		}
		io.Copy(file, reader)
		file.Close()
		if obj, ok := reader.(interface{ Close() error }); ok {
			obj.Close()
		}
		defer func() {
			os.Remove(transform.Temporary)
		}()

		/////////////////////////
		// Transcode RAW image
		if images.IsRaw(mType) {
			if images.ExtractPreview(transform) == nil {
				mType = "image/jpeg"
				(*res).Header().Set("Content-Type", mType)
			} else {
				log.Println("> preview nope")
				return reader, nil
			}
		}

		/////////////////////////
		// Final stage: resizing
		if mType != "image/jpeg" && mType != "image/png" && mType != "image/gif" && mType != "image/tiff" {
			return reader, nil
		}
		return images.CreateThumbnail(transform)
	}
	return reader, nil
}

func RandomString(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = Letters[rand.Intn(len(Letters))]
	}
	return string(b)
}
