package routes

import (
	"fmt"
	"net/http"
	"net/http/pprof"
	"os"
	"runtime"
	"runtime/debug"
	"strconv"

	"github.com/gorilla/mux"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/ctrl"
	. "github.com/mickael-kerjean/filestash/server/middleware"
)

func Build(a App) *mux.Router {
	var (
		r           *mux.Router = mux.NewRouter()
		middlewares []Middleware
	)

	// API for Session
	session := r.PathPrefix(WithBase("/api/session")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, PluginInjector}
	session.HandleFunc("", NewMiddlewareChain(SessionGet, middlewares, a)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, RateLimiter, BodyParser, PluginInjector}
	session.HandleFunc("", NewMiddlewareChain(SessionAuthenticate, middlewares, a)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, PluginInjector}
	session.HandleFunc("", NewMiddlewareChain(SessionLogout, middlewares, a)).Methods("DELETE")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, PluginInjector}
	session.HandleFunc("/auth/{service}", NewMiddlewareChain(SessionOAuthBackend, middlewares, a)).Methods("GET")
	session.HandleFunc("/auth/", NewMiddlewareChain(SessionAuthMiddleware, middlewares, a)).Methods("GET", "POST")

	// API for Admin Console
	admin := r.PathPrefix(WithBase("/admin/api")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureOrigin, PluginInjector}
	admin.HandleFunc("/session", NewMiddlewareChain(AdminSessionGet, middlewares, a)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureOrigin, RateLimiter, PluginInjector}
	admin.HandleFunc("/session", NewMiddlewareChain(AdminSessionAuthenticate, middlewares, a)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, AdminOnly, SecureOrigin, PluginInjector}
	admin.HandleFunc("/config", NewMiddlewareChain(PrivateConfigHandler, middlewares, a)).Methods("GET")
	admin.HandleFunc("/config", NewMiddlewareChain(PrivateConfigUpdateHandler, middlewares, a)).Methods("POST")
	admin.HandleFunc("/middlewares/authentication", NewMiddlewareChain(AdminAuthenticationMiddleware, middlewares, a)).Methods("GET")
	admin.HandleFunc("/audit", NewMiddlewareChain(FetchAuditHandler, middlewares, a)).Methods("GET")
	middlewares = []Middleware{IndexHeaders, AdminOnly, PluginInjector}
	admin.HandleFunc("/logs", NewMiddlewareChain(FetchLogHandler, middlewares, a)).Methods("GET")

	// API for File management
	files := r.PathPrefix(WithBase("/api/files")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, WithPublicAPI, SessionStart, LoggedInOnly, PluginInjector}
	files.HandleFunc("/cat", NewMiddlewareChain(FileCat, middlewares, a)).Methods("GET", "HEAD")
	files.HandleFunc("/zip", NewMiddlewareChain(FileDownloader, middlewares, a)).Methods("GET")
	files.HandleFunc("/unzip", NewMiddlewareChain(FileExtract, middlewares, a)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, WithPublicAPI, SessionStart, LoggedInOnly, PluginInjector}
	files.HandleFunc("/cat", NewMiddlewareChain(FileAccess, middlewares, a)).Methods("OPTIONS")
	files.HandleFunc("/cat", NewMiddlewareChain(FileSave, middlewares, a)).Methods("POST")
	files.HandleFunc("/ls", NewMiddlewareChain(FileLs, middlewares, a)).Methods("GET")
	files.HandleFunc("/mv", NewMiddlewareChain(FileMv, middlewares, a)).Methods("POST")
	files.HandleFunc("/rm", NewMiddlewareChain(FileRm, middlewares, a)).Methods("POST")
	files.HandleFunc("/mkdir", NewMiddlewareChain(FileMkdir, middlewares, a)).Methods("POST")
	files.HandleFunc("/touch", NewMiddlewareChain(FileTouch, middlewares, a)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, WithPublicAPI, SessionStart, LoggedInOnly, PluginInjector}
	files.HandleFunc("/search", NewMiddlewareChain(FileSearch, middlewares, a)).Methods("GET")

	// API for Shared link
	share := r.PathPrefix(WithBase("/api/share")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, LoggedInOnly, PluginInjector}
	share.HandleFunc("", NewMiddlewareChain(ShareList, middlewares, a)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, BodyParser, PluginInjector}
	share.HandleFunc("/{share}/proof", NewMiddlewareChain(ShareVerifyProof, middlewares, a)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, CanManageShare, PluginInjector}
	share.HandleFunc("/{share}", NewMiddlewareChain(ShareDelete, middlewares, a)).Methods("DELETE")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, BodyParser, CanManageShare, PluginInjector}
	share.HandleFunc("/{share}", NewMiddlewareChain(ShareUpsert, middlewares, a)).Methods("POST")

	// Webdav server / Shared Link
	middlewares = []Middleware{IndexHeaders, SecureHeaders, PluginInjector}
	if os.Getenv("CANARY") == "" { // TODO: remove once migration is done
		r.HandleFunc(WithBase("/s/{share}"), NewMiddlewareChain(LegacyIndexHandler, middlewares, a)).Methods("GET")
	} else {
		r.HandleFunc(WithBase("/s/{share}"), NewMiddlewareChain(ServeFrontofficeHandler, middlewares, a)).Methods("GET")
	}
	middlewares = []Middleware{WebdavBlacklist, SessionStart, PluginInjector}
	r.PathPrefix(WithBase("/s/{share}")).Handler(NewMiddlewareChain(WebdavHandler, middlewares, a))
	middlewares = []Middleware{ApiHeaders, SecureHeaders, RedirectSharedLoginIfNeeded, SessionStart, LoggedInOnly, PluginInjector}
	r.PathPrefix(WithBase("/api/export/{share}/{mtype0}/{mtype1}")).Handler(NewMiddlewareChain(FileExport, middlewares, a))

	// Application Resources
	middlewares = []Middleware{ApiHeaders, SecureHeaders, PluginInjector}
	r.HandleFunc(WithBase("/api/config"), NewMiddlewareChain(PublicConfigHandler, middlewares, a)).Methods("GET")
	r.HandleFunc(WithBase("/api/backend"), NewMiddlewareChain(AdminBackend, middlewares, a)).Methods("GET")
	middlewares = []Middleware{StaticHeaders, SecureHeaders, PluginInjector}
	if os.Getenv("CANARY") == "" { // TODO: remove after migration is done
		r.PathPrefix(WithBase("/assets")).Handler(http.HandlerFunc(NewMiddlewareChain(LegacyStaticHandler("/"), middlewares, a))).Methods("GET")
		r.HandleFunc(WithBase("/favicon.ico"), NewMiddlewareChain(LegacyStaticHandler("/assets/logo/"), middlewares, a)).Methods("GET")
		r.HandleFunc(WithBase("/sw_cache.js"), NewMiddlewareChain(LegacyStaticHandler("/assets/worker/"), middlewares, a)).Methods("GET")
	} else { // TODO: remove this after migration is done
		r.PathPrefix(WithBase("/assets")).Handler(http.HandlerFunc(NewMiddlewareChain(ServeFile("/"), middlewares, a))).Methods("GET")
		r.HandleFunc(WithBase("/favicon.ico"), NewMiddlewareChain(ServeFile("/assets/logo/"), middlewares, a)).Methods("GET")
	}

	// Other endpoints
	middlewares = []Middleware{ApiHeaders, PluginInjector}
	r.HandleFunc(WithBase("/report"), NewMiddlewareChain(ReportHandler, middlewares, a)).Methods("POST")
	middlewares = []Middleware{IndexHeaders, SecureHeaders, PluginInjector}
	r.HandleFunc(WithBase("/about"), NewMiddlewareChain(AboutHandler, middlewares, a)).Methods("GET")
	r.HandleFunc(WithBase("/robots.txt"), NewMiddlewareChain(RobotsHandler, []Middleware{}, a))
	r.HandleFunc(WithBase("/manifest.json"), NewMiddlewareChain(ManifestHandler, []Middleware{}, a)).Methods("GET")
	r.HandleFunc(WithBase("/.well-known/security.txt"), NewMiddlewareChain(WellKnownSecurityHandler, []Middleware{}, a)).Methods("GET")
	r.HandleFunc(WithBase("/healthz"), NewMiddlewareChain(HealthHandler, []Middleware{}, a)).Methods("GET")
	r.HandleFunc(WithBase("/custom.css"), NewMiddlewareChain(CustomCssHandler, []Middleware{}, a)).Methods("GET")
	r.PathPrefix(WithBase("/doc")).Handler(NewMiddlewareChain(DocPage, []Middleware{}, a)).Methods("GET", "POST", "PUT", "DELETE", "OPTIONS")

	if os.Getenv("DEBUG") == "true" {
		initDebugRoutes(r)
	}
	initPluginsRoutes(r, &a)

	middlewares = []Middleware{SecureHeaders, PluginInjector}
	r.PathPrefix(WithBase("/admin")).Handler(http.HandlerFunc(NewMiddlewareChain(ServeBackofficeHandler, middlewares, a))).Methods("GET")
	middlewares = []Middleware{IndexHeaders, SecureHeaders, PluginInjector}
	if os.Getenv("CANARY") == "" { // TODO: remove once migration is done
		r.PathPrefix("/").Handler(http.HandlerFunc(NewMiddlewareChain(LegacyIndexHandler, middlewares, a))).Methods("GET", "POST")
	} else {
		r.PathPrefix("/").Handler(http.HandlerFunc(NewMiddlewareChain(ServeFrontofficeHandler, middlewares, a))).Methods("GET", "POST")
	}
	return r
}

func initDebugRoutes(r *mux.Router) {
	r.HandleFunc("/debug/pprof/", pprof.Index)
	r.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
	r.HandleFunc("/debug/pprof/profile", pprof.Profile)
	r.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
	r.HandleFunc("/debug/pprof/trace", pprof.Trace)
	r.Handle("/debug/pprof/goroutine", pprof.Handler("goroutine"))
	r.Handle("/debug/pprof/heap", pprof.Handler("heap"))
	r.Handle("/debug/pprof/threadcreate", pprof.Handler("threadcreate"))
	r.Handle("/debug/pprof/block", pprof.Handler("block"))
	r.Handle("/debug/pprof/allocs", pprof.Handler("allocs"))
	r.Handle("/debug/pprof/mutex", pprof.Handler("mutex"))
	r.HandleFunc("/debug/free", func(w http.ResponseWriter, r *http.Request) {
		debug.FreeOSMemory()
		w.Write([]byte("DONE"))
	})
	bToMb := func(b uint64) string {
		return strconv.Itoa(int(b / 1024 / 1024))
	}
	r.HandleFunc("/debug/memory", func(w http.ResponseWriter, r *http.Request) {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		w.Write([]byte("<p style='font-family:monospace'>"))
		w.Write([]byte("Alloc      = " + bToMb(m.Alloc) + "MiB <br>"))
		w.Write([]byte("TotalAlloc = " + bToMb(m.TotalAlloc) + "MiB <br>"))
		w.Write([]byte("Sys        = " + bToMb(m.Sys) + "MiB <br>"))
		w.Write([]byte("NumGC      = " + strconv.Itoa(int(m.NumGC))))
		w.Write([]byte("</p>"))
	})
}

func initPluginsRoutes(r *mux.Router, a *App) {
	// Endpoints handle by plugins
	for _, obj := range Hooks.Get.HttpEndpoint() {
		obj(r, a)
	}
	// frontoffice overrides: it is the mean by which plugin can interact with the frontoffice
	for _, obj := range Hooks.Get.FrontendOverrides() {
		r.HandleFunc(obj, func(res http.ResponseWriter, req *http.Request) {
			res.Header().Set("Content-Type", GetMimeType(req.URL.String()))
			res.Write([]byte(fmt.Sprintf("/* Default '%s' */", obj)))
		})
	}
	// map file types to application handler
	r.HandleFunc(WithBase("/overrides/xdg-open.js"), func(res http.ResponseWriter, req *http.Request) {
		res.Header().Set("Content-Type", GetMimeType(req.URL.String()))
		res.Write([]byte(`window.overrides["xdg-open"] = function(mime){`))
		openers := Hooks.Get.XDGOpen()
		for i := 0; i < len(openers); i++ {
			res.Write([]byte(openers[i]))
		}
		res.Write([]byte(`return null;}`))
	})
}
