package plg_starter_http

import (
	"context"
	"fmt"
	"net/http"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/gorilla/mux"
)

func init() {
	Hooks.Register.Starter(Start)
}

func Start(ctx context.Context, r *mux.Router) {
	Log.Info("[http] starting ...")
	port := Config.Get("general.port").Int()
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: r,
	}
	go func() {
		ensureAppHasBooted(
			fmt.Sprintf("http://127.0.0.1:%d%s", port, WithBase("/about")),
			fmt.Sprintf("[http] listening on :%d", port),
		)
		<-ctx.Done()
		srv.Shutdown(context.Background())
	}()
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		Log.Error("error: %v", err)
	}
}

func ensureAppHasBooted(address string, message string) {
	for i := 0; i < 10; i++ {
		if i > 10 {
			Log.Warning("[http] didn't boot")
			break
		}
		time.Sleep(250 * time.Millisecond)
		res, err := http.Get(address)
		if err != nil {
			continue
		}
		res.Body.Close()
		if res.StatusCode != http.StatusOK && res.StatusCode != http.StatusNotFound {
			continue
		}
		Log.Info(message)
		break
	}
}
