package plg_starter_web

import (
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/crypto/acme/autocert"
	"net/http"
	"path/filepath"
)

func WebServer(r *mux.Router) {
	certManager := autocert.Manager{
		Prompt:     autocert.AcceptTOS,
		HostPolicy: autocert.HostWhitelist(Config.Get("general.host").String()),
		Cache:      autocert.DirCache(filepath.Join(CERT_PATH, "ssl")),
	}
	go func() {
		if err := http.ListenAndServe(":http", certManager.HTTPHandler(nil)); err != nil {
			Log.Error("error: %v", err)
			return
		}
	}()
	srv := &http.Server{
		Addr:      ":https",
		Handler:   r,
		TLSConfig: certManager.TLSConfig(),
	}
	if err := srv.ListenAndServeTLS("", ""); err != nil {
		Log.Error("error: %v", err)
		return
	}
}
