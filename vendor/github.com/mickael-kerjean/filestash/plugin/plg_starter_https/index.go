package plg_starter_https

import (
	"crypto/tls"
	"fmt"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/common/ssl"
	"golang.org/x/crypto/acme/autocert"
	"net/http"
	"path/filepath"
	"time"
)

func init() {
	domain := Config.Get("general.host").String()

	Hooks.Register.Starter(func (r *mux.Router) {
		Log.Info("[https] starting ...%s", domain)
		srv := &http.Server{
			Addr: fmt.Sprintf(":https"),
			Handler: r,
			TLSNextProto: make(map[string]func(*http.Server, *tls.Conn, http.Handler), 0),
			TLSConfig: &DefaultTLSConfig,
			ErrorLog: NewNilLogger(),
		}

		switch domain {
		case "":
			TLSCert, roots, err := ssl.GenerateSelfSigned()
			if err != nil {
				return
			}
			srv.TLSConfig.Certificates = []tls.Certificate{ TLSCert }
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
				Cache:      autocert.DirCache(filepath.Join(GetCurrentDir(), CERT_PATH)),
			}
			srv.TLSConfig.GetCertificate = mngr.GetCertificate
		}

		go func() {
			if err := srv.ListenAndServeTLS("", ""); err != nil {
				Log.Error("[https]: listen_serve %v", err)
				return
			}
		}()
		go func() {
			srv := http.Server{
				Addr: fmt.Sprintf(":http"),
				ReadTimeout:  5 * time.Second,
				WriteTimeout: 5 * time.Second,
				Handler: http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
					res.Header().Set("Connection", "close")
					http.Redirect(
						res,
						req,
						"https://" + req.Host + req.URL.String(),
						http.StatusMovedPermanently,
					)
				}),
			}
			if err := srv.ListenAndServe(); err != nil {
				Log.Error("[https]: http_redirect %v", err)
				return
			}
		}()
		go ensureAppHasBooted("https://127.0.0.1/about", fmt.Sprintf("[https] started"))
	})
}


func ensureAppHasBooted(address string, message string) {
	i := 0
	for {
		if i > 10 {
			Log.Warning("[https] no boot")
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
