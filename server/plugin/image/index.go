package main

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/plugin/image/lib"
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

func Register(conf *Config) []Plugin {
	conf.Get("plugins.transcoder.image.enable").Default(true)

	cachePath := filepath.Join(GetCurrentDir(), ImageCachePath)
	os.RemoveAll(cachePath)
	os.MkdirAll(cachePath, os.ModePerm)

	return []Plugin{
		{
			Type: PROCESS_FILE_CONTENT_BEFORE_SEND, // where to hook our plugin in the request lifecycle
			Call: hook, // actual function we trigger
			Priority: -1, // last plugin to execute
		},
	}
}

func hook(reader io.Reader, ctx *App, res *http.ResponseWriter, req *http.Request) (io.Reader, error){
	if ctx.Config.Get("plugins.transcoder.image.enable").Bool() == false {
		return reader, nil
	}
	Log.Debug("Plugin::Image")

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
}
