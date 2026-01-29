package main

import (
	"os"
	"sync"

	"github.com/gorilla/mux"
	"github.com/mickael-kerjean/filestash"
	"github.com/mickael-kerjean/filestash/server"
	"github.com/mickael-kerjean/filestash/server/ctrl"
	"github.com/mickael-kerjean/filestash/server/model"
	"github.com/mickael-kerjean/filestash/server/workflow"

	. "github.com/mickael-kerjean/filestash/server/common"
	_ "github.com/mickael-kerjean/filestash/server/plugin"
	_ "github.com/mickael-kerjean/filestash/server/runtime"
)

func main() {
	Run(mux.NewRouter())
}

func Run(router *mux.Router) {
	check(InitLogger(), "Logger init failed. err=%s")
	check(InitConfig(), "Config init failed. err=%s")
	check(workflow.Init(), "Worklow Initialisation failure. err=%s")
	check(model.PluginDiscovery(), "Plugin Discovery failed. err=%s")
	check(ctrl.InitPluginList(embed.EmbedPluginList, model.PLUGINS), "Plugin Initialisation failed. err=%s")
	if len(Hooks.Get.Starter()) == 0 {
		check(ErrNotFound, "Missing starter plugin. err=%s")
	}
	for _, fn := range Hooks.Get.Onload() {
		fn()
	}
	for _, obj := range Hooks.Get.HttpEndpoint() {
		obj(router)
	}
	server.Build(router)
	server.PluginRoutes(router)
	if os.Getenv("DEBUG") == "true" {
		server.DebugRoutes(router)
	}
	server.CatchAll(router)
	var wg sync.WaitGroup
	for _, obj := range Hooks.Get.Starter() {
		wg.Add(1)
		go func() {
			obj(router)
			wg.Done()
		}()
	}
	wg.Wait()
}

func check(err error, msg string) {
	if err == nil {
		return
	}
	Log.Error(msg, err.Error())
	os.Exit(1)
}
