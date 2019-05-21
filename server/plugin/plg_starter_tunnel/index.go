package plg_starter_tunnel

/*
 * This plugin was inspired from the Inlets project: https://github.com/alexellis/inlets
 * which is nothing but a wrapper on: github.com/rancher/remotedialer. As such we're using the parent
 * project directly, avoiding unecessary dependencies. Interesting alternatives would include:
 * - https://github.com/koding/tunnel using yamux which looks very interesting
 * - https://github.com/mmatczuk/go-http-tunnel
 * - https://github.com/jpillora/chisel
 */

import (
	"context"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/remotedialer"
	"io/ioutil"
	"net/http"
	"time"
)

var backoff func() time.Duration = backoff_strategy()

func init() {
	tunnel_enable := func() bool {
		return Config.Get("features.server.tunnel_enable").Schema(func(f *FormElement) *FormElement{
			if f == nil {
				f = &FormElement{}
			}
			f.Default = false
			f.Name = "tunnel_enable"
			f.Type = "enable"
			f.Target = []string{"tunnel_url"}
			f.Description = "Enable/Disable tunnel for secure access from the internet"
			f.Placeholder = "Default: false"
			return f
		}).Bool()
	}
	tunnel_enable()
	Config.Get("features.server.tunnel_url").Schema(func(f *FormElement) *FormElement{
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "tunnel_url"
		f.Name = "tunnel_url"
		f.Type = "text"
		f.Target = []string{}
		f.Description = "URL from which you can access your filestash. Contact us to make it more friendly"
		f.ReadOnly = true
		f.Placeholder = "LOADING... Refresh the page in a few seconds"
		return f
	})

	Hooks.Register.Starter(func (r *mux.Router) {
		Log.Info("[http] starting ...")

		srv := &http.Server{
			Addr:    ":8334",
			Handler: r,
		}
		go ensureAppHasBooted("http://127.0.0.1:8334/about", "[http] listening on :8334")
		go func() {
			if err := srv.ListenAndServe(); err != nil {
				Log.Error("error: %v", err)
				return
			}
		}()
		Config.Get("features.server.tunnel_url").Set(nil)		
		if tunnel_enable() == false {
			startTunnel := false
			for {
				select {
				case <- Config.OnChange:
					if tunnel_enable() == true {
						startTunnel = true
						break
					}
				}
				if startTunnel == true { break }
			}
		}

		Log.Info("[tunnel] starting ...")
		go func() {
			for {
				// Stage1: Register a domain name from which Filestash will be available
				req, err := http.NewRequest("GET", "https://tunnel.filestash.app/register", nil);
				if err != nil {
					Log.Info("[tunnel] registration_request %s", err.Error())
					time.Sleep(backoff())
					continue
				}
				req.Header.Add("X-Machine-ID", GenerateMachineID())
				res, err := HTTP.Do(req)
				if err != nil {
					Log.Info("[tunnel] registration_error %s", err.Error())
					time.Sleep(backoff())
					continue
				} else if res.StatusCode != http.StatusOK {
					Log.Info("[tunnel] registration_failure HTTP status: %d", res.StatusCode)
					time.Sleep(backoff())
					continue
				}
				d, _ := ioutil.ReadAll(res.Body)
				res.Body.Close()

				// Stage2: Tunnel data from
				remotedialer.ClientConnect(
					"wss://tunnel.filestash.app/connect",
					http.Header{
						"X-Machine-ID": []string{ GenerateMachineID() },
					},
					nil,
					func(proto, address string) bool {
						if proto == "tcp" && address == "127.0.0.1:8334" {
							return true
						}
						return false
					},
					func(context.Context) error {
						Log.Info("[tunnel] started %s", string(d))
						Config.Get("features.server.tunnel_url").Set(string(d))
						return nil
					},
				)
				Log.Info("[tunnel] closed")
				time.Sleep(backoff())
				Log.Info("[tunnel] restarting ...")
			}
		}()
	})
}

func backoff_strategy() func() time.Duration {
	var last_error time.Time     = time.Now()
	var last_wait  time.Duration = 1 * time.Second

	return func() time.Duration {
		timeSinceLastError := time.Now().Sub(last_error)
		last_error = time.Now()
		if timeSinceLastError < 60 * time.Minute {
			if last_wait < 60 * time.Second {
				last_wait *= 2
			}
			return last_wait
		}
		last_wait = 1 * time.Second
		return last_wait
	}
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
