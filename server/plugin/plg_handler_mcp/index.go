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
		m := []Middleware{}
		r.HandleFunc("/sse", NewMiddlewareChain(srv.sseHandler, m, *app))
		r.HandleFunc("/messages", NewMiddlewareChain(srv.messageHandler, m, *app))
		r.HandleFunc("/.well-known/oauth-authorization-server", NewMiddlewareChain(srv.WellKnownInfoHandler, m, *app))
		r.HandleFunc("/mcp/authorize", NewMiddlewareChain(srv.AuthorizeHandler, m, *app))
		r.HandleFunc("/mcp/token", NewMiddlewareChain(srv.TokenHandler, m, *app))
		m = []Middleware{BodyParser}
		r.HandleFunc("/mcp/register", NewMiddlewareChain(srv.RegisterHandler, m, *app))
		m = []Middleware{SessionStart, LoggedInOnly}
		r.HandleFunc("/api/mcp", NewMiddlewareChain(srv.CallbackHandler, m, *app))
		return nil
	})
}
