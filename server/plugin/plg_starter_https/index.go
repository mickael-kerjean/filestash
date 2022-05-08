package plg_starter_https

import (
	"crypto/tls"
	"fmt"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/common/ssl"
	"net/http"
	"time"
)

func init() {
	domain := Config.Get("general.host").String()
	port := Config.Get("general.port").Int()

	Hooks.Register.Starter(func(r *mux.Router) {
		Log.Info("[https] starting ...%s", domain)
		srv := &http.Server{
			Addr:         fmt.Sprintf(":%d", port),
			Handler:      r,
			TLSNextProto: make(map[string]func(*http.Server, *tls.Conn, http.Handler), 0),
			TLSConfig:    &DefaultTLSConfig,
			ErrorLog:     NewNilLogger(),
		}

		TLSCert, roots, err := ssl.GenerateSelfSigned()
		if err != nil {
			return
		}
		srv.TLSConfig.Certificates = []tls.Certificate{TLSCert}
		HTTPClient.Transport.(*TransformedTransport).Orig.(*http.Transport).TLSClientConfig = &tls.Config{
			RootCAs: roots,
		}
		HTTP.Transport.(*TransformedTransport).Orig.(*http.Transport).TLSClientConfig = &tls.Config{
			RootCAs: roots,
		}

		go ensureAppHasBooted(fmt.Sprintf("https://127.0.0.1:%d/about", port), fmt.Sprintf("[https] listening on :%d", port))
		if err := srv.ListenAndServeTLS("", ""); err != nil {
			Log.Error("[https]: listen_serve %v", err)
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
		res, err := HTTPClient.Get(address)
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
