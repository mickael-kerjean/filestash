package middleware

import "github.com/mickael-kerjean/filestash/server/pkg/middleware"

var (
	NewMiddlewareChain = middleware.NewMiddlewareChain
	IndexHeaders       = middleware.IndexHeaders
	StaticHeaders      = middleware.StaticHeaders
	ApiHeaders         = middleware.ApiHeaders
	PublicCORS         = middleware.PublicCORS
	SecureHeaders      = middleware.SecureHeaders
	SecureOrigin       = middleware.SecureOrigin
	LoggedInOnly       = middleware.LoggedInOnly
	AdminOnly          = middleware.AdminOnly
	SessionTry         = middleware.SessionTry
	SessionStart       = middleware.SessionStart
	BodyParser         = middleware.BodyParser
	CanManageShare     = middleware.CanManageShare
	PluginInjector     = middleware.PluginInjector
	RateLimiter        = middleware.RateLimiter
)
