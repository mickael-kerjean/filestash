package plg_handler_mcp

import (
	"sync"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/middleware"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/config"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/utils"

	"github.com/gorilla/mux"
)

type Server struct {
	sessions sync.Map
}

func init() {
	Hooks.Register.Onload(func() {
		PluginEnable()
	})

	Hooks.Register.HttpEndpoint(func(r *mux.Router) error {
		if !PluginEnable() {
			return nil
		}
		srv := Server{}
		m := []Middleware{WithCORS}
		r.HandleFunc("/sse", NewMiddlewareChain(srv.sseHandler, m)).Methods("GET", "OPTIONS")
		r.HandleFunc("/messages", NewMiddlewareChain(srv.messageHandler, m)).Methods("POST", "OPTIONS")
		r.HandleFunc("/.well-known/oauth-authorization-server", NewMiddlewareChain(srv.WellKnownOAuthAuthorizationServerHandler, m)).Methods("GET", "OPTIONS")
		r.HandleFunc("/.well-known/oauth-protected-resource", NewMiddlewareChain(srv.WellKnownOAuthProtectedResourceHandler, m)).Methods("GET", "OPTIONS")
		r.HandleFunc("/.well-known/oauth-protected-resource/sse", NewMiddlewareChain(srv.WellKnownOAuthProtectedResourceHandler, m)).Methods("GET", "OPTIONS")

		r.HandleFunc("/mcp/token", NewMiddlewareChain(srv.TokenHandler, m)).Methods("POST")
		m = []Middleware{}
		r.HandleFunc("/mcp/authorize", NewMiddlewareChain(srv.AuthorizeHandler, m)).Methods("GET")
		m = []Middleware{BodyParser}
		r.HandleFunc("/mcp/register", NewMiddlewareChain(srv.RegisterHandler, m)).Methods("POST")
		m = []Middleware{SessionStart, LoggedInOnly}
		r.HandleFunc("/api/mcp", NewMiddlewareChain(srv.CallbackHandler, m)).Methods("GET")
		return nil
	})
}
