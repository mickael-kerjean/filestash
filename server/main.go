package main

import (
	//"context"
	//"github.com/getlantern/systray"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/router"
	//"github.com/pkg/browser"
	//"io/ioutil"
	"strconv"
)

var APP_URL string

func main() {
	app := App{}
	app.Config = NewConfig()
	app.Helpers = NewHelpers(app.Config)
	router.Init(&app)

	APP_URL = "http://" + app.Config.General.Host + ":" + strconv.Itoa(app.Config.General.Port)
	// systray.Run(setupSysTray(&app), func() {
	// 	srv.Shutdown(context.TODO())
	// })
	select {}
}

// func setupSysTray(a *App) func() {
// 	return func() {
// 		b, err := ioutil.ReadFile(a.Config.Runtime.AbsolutePath("data/public/assets/logo/favicon.ico"))
// 		if err != nil {
// 			return
// 		}
// 		systray.SetIcon(b)
// 		mOpen := systray.AddMenuItem("Open", "Open in a browser")
// 		mQuit := systray.AddMenuItem("Quit", "Quit the whole app")

// 		go func() {
// 			for {
// 				select {
// 				case <-mOpen.ClickedCh:
// 					browser.OpenURL(APP_URL)
// 				case <-mQuit.ClickedCh:
// 					systray.Quit()
// 					return
// 				}
// 			}
// 		}()
// 	}
// }
