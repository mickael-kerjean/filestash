package middleware

import (
	"github.com/mickael-kerjean/filestash/server/pkg/admin"
	"github.com/mickael-kerjean/filestash/server/pkg/middleware"
	"github.com/mickael-kerjean/filestash/server/pkg/session"
	"github.com/mickael-kerjean/filestash/server/pkg/share"
)

var (
	NewMiddlewareChain = middleware.NewMiddlewareChain
	IndexHeaders       = middleware.IndexHeaders
	StaticHeaders      = middleware.StaticHeaders
	ApiHeaders         = middleware.ApiHeaders
	PublicCORS         = middleware.PublicCORS
	SecureHeaders      = middleware.SecureHeaders
	SecureOrigin       = middleware.SecureOrigin
	LoggedInOnly       = middleware.LoggedInOnly
	BodyParser         = middleware.BodyParser
	PluginInjector     = middleware.PluginInjector
	RateLimiter        = middleware.RateLimiter
	AdminOnly          = admin.AdminOnly
	SessionTry         = session.Try
	SessionStart       = session.Start
	CanManageShare     = share.CanManageShare(session.Start, session.FromRequest)
)
