package main

import (
	"bytes"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/nfnt/resize"
    "image/jpeg"
	"io"
	"net/http"
)

func Init(config *Config) {
	plugin_enable := config.Get("transcoder.image.enable").Default(true).Bool()
	plugin_thumbsize := uint(config.Get("transcoder.image.thumbnail_size").Default(300).Int())

	Hooks.Register.ProcessFileContentBeforeSend(func(reader io.Reader, ctx *App, res *http.ResponseWriter, req *http.Request) (io.Reader, error){
		if plugin_enable == false {
			return reader, nil
		}

		query := req.URL.Query()
		mType := GetMimeType(query.Get("path"))

		if mType != "image/jpeg" {
			return reader, nil
		} else if query.Get("thumbnail") != "true" {
			return reader, nil
		}

		(*res).Header().Set("Cache-Control", "max-age=3600")
		img, err := jpeg.Decode(reader)
		if err != nil {
			return reader, nil
		}
		if obj, ok := reader.(interface{ Close() error }); ok {
			obj.Close()
		}
		img = resize.Resize(plugin_thumbsize, 0, img, resize.Lanczos3)
		out := bytes.NewBufferString("")
		jpeg.Encode(out, img, &jpeg.Options{50})
		return out, nil
	})
}
