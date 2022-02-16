package plg_starter_http

import (
	"fmt"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
	"time"
)

func init() {
	port := Config.Get("general.port").Int()

	Hooks.Register.Starter(func(r *mux.Router) {
		Log.Info("[http] starting ...")
		srv := &http.Server{
			Addr:    fmt.Sprintf(":%d", port),
			Handler: r,
		}
		go ensureAppHasBooted(fmt.Sprintf("http://127.0.0.1:%d/about", port), fmt.Sprintf("[http] listening on :%d", port))
		if err := srv.ListenAndServe(); err != nil {
			Log.Error("error: %v", err)
			return
		}
	})
}

func ensureAppHasBooted(address string, message string) {
	i := 0
	for {
		if i > 10 {
			Log.Warning("[http] didn't boot")
			break
		}
		time.Sleep(250 * time.Millisecond)
		res, err := http.Get(address)
		if err != nil {
			i += 1
			continue
		}
		res.Body.Close()
		if res.StatusCode != http.StatusOK {
			i += 1
			continue
		}
		Log.Info(message)
		break
	}
}
