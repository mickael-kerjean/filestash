package plg_handler_mcp

import (
	"sync"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/middleware"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/config"

	"github.com/gorilla/mux"
)

type Server struct {
	sessions sync.Map
	expired  sync.Map
}

func init() {
	Hooks.Register.Onload(func() {
		PluginEnable()
		CanEdit()
	})

	Hooks.Register.HttpEndpoint(func(r *mux.Router, app *App) error {
		if !PluginEnable() {
			return nil
		}
		srv := Server{}
		r.HandleFunc("/sse", srv.sseHandler)
		r.HandleFunc("/messages", srv.messageHandler)
		r.HandleFunc("/.well-known/oauth-authorization-server", srv.WellKnownInfoHandler)
		r.HandleFunc("/mcp/authorize", srv.AuthorizeHandler)
		r.HandleFunc("/mcp/token", srv.TokenHandler)
		r.HandleFunc("/mcp/register", srv.RegisterHandler)
		r.HandleFunc("/api/mcp", NewMiddlewareChain(
			srv.CallbackHandler,
			[]Middleware{SessionStart, LoggedInOnly},
			*app,
		))
		return nil
	})
}
