package main

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/plugin/plg_image_light/lib"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"strconv"
)

const (
	ImageCachePath = "data/cache/image/"
)

func Init(conf *Configuration) {
	plugin_enable := conf.Get("transcoder.image.enable").Default(true).Bool()

	cachePath := filepath.Join(GetCurrentDir(), ImageCachePath)
	os.RemoveAll(cachePath)
	os.MkdirAll(cachePath, os.ModePerm)

	Hooks.Register.ProcessFileContentBeforeSend(func (reader io.Reader, ctx *App, res *http.ResponseWriter, req *http.Request) (io.Reader, error){
		if plugin_enable == false {
			return reader, nil
		}

		query := req.URL.Query()
		mType := GetMimeType(query.Get("path"))

		if strings.HasPrefix(mType, "image/") == false {
			return reader, nil
		} else if mType == "image/svg" {
			return reader, nil
		} else if mType == "image/x-icon" {
			return reader, nil
		} else if query.Get("thumbnail") != "true" && query.Get("size") == "" {
			return reader, nil
		}

		/////////////////////////
		// Specify transformation
		transform := &lib.Transform{
			Temporary: GetAbsolutePath(ImageCachePath + "image_" + QuickString(10)),
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
		if lib.IsRaw(mType) {
			if lib.ExtractPreview(transform) == nil {
				mType = "image/jpeg"
				(*res).Header().Set("Content-Type", mType)
			} else {
				return reader, nil
			}
		}

		/////////////////////////
		// Final stage: resizing
		if mType != "image/jpeg" && mType != "image/png" && mType != "image/gif" && mType != "image/tiff" {
			return reader, nil
		}

		return lib.CreateThumbnail(transform)
	})
}
