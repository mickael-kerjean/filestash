package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/mickael-kerjean/filestash"
	"github.com/mickael-kerjean/filestash/server"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/ctrl"
	"github.com/mickael-kerjean/filestash/server/model"
	_ "github.com/mickael-kerjean/filestash/server/pkg"
	"github.com/mickael-kerjean/filestash/server/pkg/workflow"
	_ "github.com/mickael-kerjean/filestash/server/plugin"

	"github.com/gorilla/mux"
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
	if Hooks.Get.Starter() == nil {
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
	Hooks.Get.Starter()(withSignal(), router)
	for _, fn := range Hooks.Get.OnQuit() {
		fn()
	}
}

func check(err error, msg string) {
	if err == nil {
		return
	}
	Log.Error(msg, err.Error())
	os.Exit(1)
}

func withSignal() context.Context {
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
		<-quit
		cancel()
	}()
	return ctx
}
