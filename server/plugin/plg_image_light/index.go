package main

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_image_light/lib"
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

var Config *Configuration

func Init(conf *Configuration) {
	Config = conf

	plugin_enable := func() bool {
		return conf.Get("features.image.enable_image").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "enable_image"
			f.Type = "enable"
			f.Target = []string{"image_thumbsize", "image_thumbquality", "image_imagequality", "image_thumbcache", "image_imagecache"}
			f.Default = true
			return f
		}).Bool()
	}
	plugin_enable()

	thumb_size := func() int {
		return conf.Get("features.image.thumbnail_size").Schema(func(f *FormElement) *FormElement {			
			if f == nil {
				f = &FormElement{}
			}
			f.Type = "number"
			f.Id = "image_thumbsize"
			f.Name = "thumbnail_size"
			f.Description = "Thumbnail size in pixel"
			f.Placeholder = "Default: 300"
			f.Default = 300
			return f
		}).Int()
	}
	thumb_size()

	thumb_quality := func() int {
		return conf.Get("features.image.thumbnail_quality").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "image_thumbquality"
			f.Type = "number"
			f.Name = "thumbnail_quality"
			f.Description = "image quality on thumbnails. A lower number means smaller size at the cost of potential visual artifacts"
			f.Placeholder = "Default: 50"
			f.Default = 50
			return f
		}).Int()
	}
	thumb_quality()

	thumb_caching := func() int {
		return conf.Get("features.image.thumbnail_caching").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "image_thumbcache"
			f.Type = "number"
			f.Name = "thumbnail_caching"
			f.Description = "How much time in seconds we want to store a thumbnail in the browser"
			f.Placeholder = "Default: 259200 => 3 days"
			f.Default = 259200
			return f
		}).Int()
	}
	thumb_caching()

	image_quality := func() int {
		return conf.Get("features.image.image_quality").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "image_imagequality"
			f.Type = "number"
			f.Name = "image_quality"
			f.Description = "image quality on fullsize images. A lower number means smaller size at the cost of potential visual artifacts"
			f.Placeholder = "Default: 90"
			f.Default = 90
			return f
		}).Int()
	}
	image_quality()

	image_caching := func() int {
		return conf.Get("features.image.image_caching").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "image_imagecache"
			f.Type = "number"
			f.Name = "image_caching"
			f.Description = "How much time in seconds we want to store images on the browser"
			f.Placeholder = "Default: 3600 => 1 hour"
			f.Default = 3600
			return f
		}).Int()
	}
	image_caching()

	cachePath := filepath.Join(GetCurrentDir(), ImageCachePath)
	os.RemoveAll(cachePath)
	os.MkdirAll(cachePath, os.ModePerm)

	Hooks.Register.ProcessFileContentBeforeSend(func (reader io.Reader, ctx *App, res *http.ResponseWriter, req *http.Request) (io.Reader, error){
		if plugin_enable() == false {
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
			Size:      thumb_size(),
			Crop:      true,
			Quality:   thumb_quality(),
			Exif:      false,
		}
		if query.Get("thumbnail") == "true" {
			(*res).Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", thumb_caching()))
		} else if query.Get("size") != "" {
			(*res).Header().Set("Cache-Control", fmt.Sprintf("max-age=%d", image_caching()))
			size, err := strconv.ParseInt(query.Get("size"), 10, 64)
			if err != nil {
				return reader, nil
			}
			transform.Size = int(size)
			transform.Crop = false
			transform.Quality = image_quality()
			transform.Exif = true
		}

		/////////////////////////////
		// Insert file in the fs
		// => lower RAM usage while processing
		file, err := os.OpenFile(transform.Temporary, os.O_WRONLY|os.O_CREATE, os.ModePerm)
		if err != nil {
			return reader, ErrFilesystemError
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
