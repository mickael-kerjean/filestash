package plg_starter_http2

/*
 * In golang, HTTP2 server are written in the same way as HTTPS server, the only difference beeing
 * describe in the documentation: https://golang.org/src/net/http/doc.go#L81
 * In our implementation, we use the 'TLSNextProto' trick
 */

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/ssl"

	"github.com/gorilla/mux"
	"golang.org/x/crypto/acme/autocert"
)

var (
	SSL_PATH    string
	config_port func() int
)

func init() {
	config_port = func() int {
		return Config.Get("general.port").Int()
	}
	Hooks.Register.Onload(func() {
		SSL_PATH = filepath.Join(GetAbsolutePath(CERT_PATH), "ssl")
		os.MkdirAll(SSL_PATH, os.ModePerm)
	})

	Hooks.Register.Starter(func(ctx context.Context, r *mux.Router) {
		domain := Config.Get("general.host").String()
		Log.Info("[https] starting ...%s", domain)
		srv := &http.Server{
			Addr:      fmt.Sprintf(":%d", config_port()),
			Handler:   r,
			TLSConfig: &DefaultTLSConfig,
			ErrorLog:  NewNilLogger(),
		}

		switch domain {
		case "":
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
		default:
			mngr := autocert.Manager{
				Prompt:     autocert.AcceptTOS,
				HostPolicy: autocert.HostWhitelist(domain),
				Cache:      autocert.DirCache(SSL_PATH),
			}
			srv.TLSConfig.GetCertificate = mngr.GetCertificate
		}

		go func() {
			ensureAppHasBooted(
				fmt.Sprintf("https://127.0.0.1:%d/about", config_port()),
				fmt.Sprintf("[https] started"),
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
