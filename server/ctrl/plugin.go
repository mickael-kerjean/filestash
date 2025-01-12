package ctrl

import (
	"io"
	"net/http"
	"os"

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
	file, err := model.GetPluginFile(mux.Vars(req)["name"], path)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	defer file.Close()
	res.Header().Set("Content-Type", mtype)
	_, err = io.Copy(res, file)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
}
