package ctrl

import (
	"io"
	"net/http"
	"os"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"

	"github.com/gorilla/mux"
)

func init() {
	Hooks.Register.Onload(func() {
		if err := model.PluginDiscovery(); err != nil {
			Log.Error("Plugin Discovery failed. err=%s", err.Error())
			os.Exit(1)
		}
	})
}

func PluginExportHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	plgExports := map[string][]string{}
	for name, plg := range model.PLUGINS {
		for _, module := range plg.Modules {
			if module["type"] == "xdg-open" {
				index := module["entrypoint"]
				if index == "" {
					index = "/index.js"
				}
				plgExports[module["mime"]] = []string{
					module["application"],
					WithBase(JoinPath("/plugin/", name+index)),
				}
			}
		}
	}
	SendSuccessResult(res, plgExports)
}

func PluginStaticHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	path := mux.Vars(req)["path"]
	mtype := GetMimeType(path)
	staticConfig := []struct {
		ContentType string
		FileExt     string
	}{
		{"br", ".br"},
		{"gzip", ".gz"},
		{"", ""},
	}

	var file io.ReadCloser
	var err error
	head := res.Header()
	acceptEncoding := req.Header.Get("Accept-Encoding")
	for _, cfg := range staticConfig {
		if strings.Contains(acceptEncoding, cfg.ContentType) == false {
			continue
		}
		file, err = model.GetPluginFile(mux.Vars(req)["name"], path+cfg.FileExt)
		if err != nil {
			continue
		}
		head.Set("Content-Type", mtype)
		if cfg.ContentType != "" {
			head.Set("Content-Encoding", cfg.ContentType)
		}
		io.Copy(res, file)
		file.Close()
		return
	}

	SendErrorResult(res, err)
	return
}
