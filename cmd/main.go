package main

import (
	"os"
	"sync"

	"github.com/gorilla/mux"

	"github.com/mickael-kerjean/filestash"
	. "github.com/mickael-kerjean/filestash/server"
	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/ctrl"
	_ "github.com/mickael-kerjean/filestash/server/plugin"
)

func main() {
	start(Build(App{}))
}

func start(routes *mux.Router) {
	// Routes are served via plugins to avoid getting stuck with plain HTTP. The idea is to
	// support many more protocols in the future: HTTPS, HTTP2, TOR or whatever that sounds
	// fancy I don't know much when this got written: IPFS, solid, ...
	Log.Info("Filestash %s starting", APP_VERSION)
	if len(Hooks.Get.Starter()) == 0 {
		Log.Warning("No starter plugin available")
		os.Exit(1)
		return
	}
	InitLogger()
	InitConfig()
	InitPluginList(embed.EmbedPluginList)
	for _, fn := range Hooks.Get.Onload() {
		fn()
	}
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
