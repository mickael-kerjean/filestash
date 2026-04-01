package plg_application_volumeexplorer

import (
    . "github.com/mickael-kerjean/filestash/server/common"
    ctrl "github.com/mickael-kerjean/filestash/server/ctrl"
    . "github.com/mickael-kerjean/filestash/server/middleware"

    "github.com/gorilla/mux"
)

func init() {
    Hooks.Register.HttpEndpoint(func(r *mux.Router) error {
        r.HandleFunc("/api/plg_application_volumeexplorer/cat", NewMiddlewareChain(
            ctrl.FileCat,
            []Middleware{ApiHeaders, SecureHeaders, SessionStart, LoggedInOnly},
        )).Methods("GET", "HEAD")
        return nil
    })
}
