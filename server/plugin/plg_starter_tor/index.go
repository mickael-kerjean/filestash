package plg_starter_tor

import (
	"context"
	"net/http"
	"os"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/cretz/bine/tor"
	"github.com/gorilla/mux"
)

func init() {
	Hooks.Register.Starter(func(r *mux.Router) {
		torPath := GetAbsolutePath(CERT_PATH, "tor")
		os.MkdirAll(torPath, os.ModePerm)

		Log.Info("[tor] starting ...")
		t, err := tor.Start(nil, &tor.StartConf{
			DataDir: torPath,
		})
		if err != nil {
			Log.Error("[tor] Unable to start Tor: %v", err)
			return
		}
		defer t.Close()
		listenCtx, listenCancel := context.WithTimeout(context.Background(), 3*time.Minute)
		defer listenCancel()
		onion, err := t.Listen(listenCtx, &tor.ListenConf{Version3: true, RemotePorts: []int{80}})
		if err != nil {
			Log.Error("[tor] Unable to create onion service: %v", err)
			return
		}
		defer onion.Close()

		srv := &http.Server{
			Handler: r,
		}
		Log.Info("[tor] started http://%s.onion\n", onion.ID)
		Config.Get("features.server.tor_url").Set("http://" + onion.ID + ".onion")
		srv.Serve(onion)
	})
}
