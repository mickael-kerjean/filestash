package plg_starter_tor

import (
	"context"
	"github.com/cretz/bine/tor"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

var TOR_PATH string = filepath.Join(GetCurrentDir(), CERT_PATH, "tor")

func init() {
	os.MkdirAll(TOR_PATH, os.ModePerm)
	enable_tor := func() bool {
		return Config.Get("features.server.tor_enable").Schema(func(f *FormElement) *FormElement{
			if f == nil {
				f = &FormElement{}
			}
			f.Default = false
			f.Name = "tor_enable"
			f.Type = "enable"
			f.Target = []string{"tor_url"}
			f.Description = "Enable/Disable tor server"
			f.Placeholder = "Default: false"
			return f
		}).Bool()
	}
	enable_tor()
	Config.Get("features.server.tor_url").Schema(func(f *FormElement) *FormElement{
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "tor_url"
		f.Name = "tor_url"
		f.Type = "text"
		f.Target = []string{}
		f.Description = "Your onion site"
		f.ReadOnly = true
		f.Placeholder = "LOADING... Refresh the page in a few seconds"
		return f
	})

	Hooks.Register.Starter(func (r *mux.Router) {
		if enable_tor() == false {
			startTor := false
			for {
				select {
				case <- Config.OnChange:
					if enable_tor() == true {
						startTor = true
						break
					}
				}
				if startTor == true { break }
			}
		}
		Log.Info("[tor] starting ...")
		t, err := tor.Start(nil, &tor.StartConf{
			DataDir: TOR_PATH,
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
