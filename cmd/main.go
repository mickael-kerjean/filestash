package main

import (
	"os"
	"sync"

	"github.com/gorilla/mux"

	"github.com/mickael-kerjean/filestash"
	"github.com/mickael-kerjean/filestash/server"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/ctrl"
	"github.com/mickael-kerjean/filestash/server/model"
	_ "github.com/mickael-kerjean/filestash/server/plugin"
)

func main() {
	var (
		router *mux.Router = mux.NewRouter()
		app                = App{}
	)
	server.Build(router, app)
	Run(router, app)
}

func Run(routes *mux.Router, app App) {
	// Routes are served via plugins to avoid getting stuck with plain HTTP. The idea is to
	// support many more protocols in the future: HTTPS, HTTP2, TOR or whatever that sounds
	// fancy I don't know much when this got written: IPFS, solid, ...
	Log.Info("Filestash %s starting", APP_VERSION)
	check(InitLogger(), "Logger init failed. err=%s")
	check(InitConfig(), "Config init failed. err=%s")
	check(model.PluginDiscovery(), "Plugin Discovery failed. err=%s")
	ctrl.InitPluginList(embed.EmbedPluginList, model.PLUGINS)
	if len(Hooks.Get.Starter()) == 0 {
		check(ErrNotFound, "Missing starter plugin. err=%s")
	}
	for _, obj := range Hooks.Get.HttpEndpoint() {
		obj(routes, &app)
	}
	for _, fn := range Hooks.Get.Onload() {
		fn()
	}
	server.CatchAll(routes, app)
	var wg sync.WaitGroup
	for _, obj := range Hooks.Get.Starter() {
		wg.Add(1)
		go func() {
			obj(routes)
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
