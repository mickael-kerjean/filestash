package main

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/router"
	"strconv"
)

var APP_URL string

func main() {
	app := App{}
	app.Config = NewConfig()
	app.Helpers = NewHelpers(app.Config)
	router.Init(&app)

	APP_URL = "http://" + app.Config.General.Host + ":" + strconv.Itoa(app.Config.General.Port)
	select {}
}
