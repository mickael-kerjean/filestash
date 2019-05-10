package plg_start_tor

import (
	"context"
	"github.com/cretz/bine/tor"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
	"time"
)

func init() {
	Hooks.Register.Starter(func (r *mux.Router) {
		Log.Info("[tor] starting ...")
		t, err := tor.Start(nil, nil)
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
		Log.Info("[tor] started on http://%v.onion\n", onion.ID)
		srv.Serve(onion)
	})
}
