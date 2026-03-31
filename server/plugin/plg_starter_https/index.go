package plg_starter_https

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/ssl"

	"github.com/gorilla/mux"
)

func init() {
	Hooks.Register.Starter(func(ctx context.Context, r *mux.Router) {
		domain := Config.Get("general.host").String()
		port := Config.Get("general.port").Int()
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

		go func() {
			ensureAppHasBooted(
				fmt.Sprintf("https://127.0.0.1:%d/about", port),
				fmt.Sprintf("[https] listening on :%d", port),
			)
			<-ctx.Done()
			srv.Shutdown(context.Background())
		}()
		if err := srv.ListenAndServeTLS("", ""); err != nil && err != http.ErrServerClosed {
			Log.Error("[https]: listen_serve %v", err)
			return
		}
	})
}

func ensureAppHasBooted(address string, message string) {
	for i := 0; i < 10; i++ {
		if i > 10 {
			Log.Warning("[https] didn't boot")
			break
		}
		time.Sleep(250 * time.Millisecond)
		res, err := HTTPClient.Get(address)
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
