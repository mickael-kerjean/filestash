package server

import (
	"net/http"
	"net/http/pprof"
	"runtime"
	"runtime/debug"
	"strconv"

	"github.com/gorilla/mux"

	. "github.com/mickael-kerjean/filestash/server/common"
	// . "github.com/mickael-kerjean/filestash/server/ctrl"
	. "github.com/mickael-kerjean/filestash/server/middleware"

	"github.com/mickael-kerjean/filestash/server/pkg/admin"
	"github.com/mickael-kerjean/filestash/server/pkg/files"
	"github.com/mickael-kerjean/filestash/server/pkg/frontend"
	"github.com/mickael-kerjean/filestash/server/pkg/session"
	"github.com/mickael-kerjean/filestash/server/pkg/share"
	"github.com/mickael-kerjean/filestash/server/pkg/workflow"
)

func Build(r *mux.Router) {
	var (
		router      *mux.Router
		middlewares []Middleware
	)

	// API for Session
	router = r.PathPrefix(WithBase("/api/session")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, PluginInjector}
	router.HandleFunc("", NewMiddlewareChain(session.SessionGet, middlewares)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, RateLimiter, BodyParser, PluginInjector}
	router.HandleFunc("", NewMiddlewareChain(session.SessionAuthenticate, middlewares)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, PluginInjector}
	router.HandleFunc("", NewMiddlewareChain(session.SessionLogout, middlewares)).Methods("DELETE")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, PluginInjector}
	router.HandleFunc("/auth/{service}", NewMiddlewareChain(session.SessionOAuthBackend, middlewares)).Methods("GET")
	router.HandleFunc("/auth/", NewMiddlewareChain(session.SessionAuthMiddleware, middlewares)).Methods("GET", "POST")

	// API for Admin Console
	router = r.PathPrefix(WithBase("/admin/api")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureOrigin, PluginInjector}
	router.HandleFunc("/session", NewMiddlewareChain(admin.AdminSessionGet, middlewares)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureOrigin, RateLimiter, PluginInjector}
	router.HandleFunc("/session", NewMiddlewareChain(admin.AdminSessionAuthenticate, middlewares)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, AdminOnly, SecureOrigin, PluginInjector}
	router.HandleFunc("/config", NewMiddlewareChain(admin.PrivateConfigHandler, middlewares)).Methods("GET")
	router.HandleFunc("/config", NewMiddlewareChain(admin.PrivateConfigUpdateHandler, middlewares)).Methods("POST")
	router.HandleFunc("/workflow", NewMiddlewareChain(workflow.WorkflowAll, middlewares)).Methods("GET")
	router.HandleFunc("/workflow/{workflowID}", NewMiddlewareChain(workflow.WorkflowGet, middlewares)).Methods("GET")
	router.HandleFunc("/workflow", NewMiddlewareChain(workflow.WorkflowUpsert, middlewares)).Methods("POST")
	router.HandleFunc("/workflow", NewMiddlewareChain(workflow.WorkflowDelete, middlewares)).Methods("DELETE")
	router.HandleFunc("/middlewares/authentication", NewMiddlewareChain(admin.AdminAuthenticationMiddleware, middlewares)).Methods("GET")
	router.HandleFunc("/audit", NewMiddlewareChain(admin.FetchAuditHandler, middlewares)).Methods("GET")
	middlewares = []Middleware{IndexHeaders, AdminOnly, PluginInjector}
	router.HandleFunc("/logs", NewMiddlewareChain(admin.FetchLogHandler, middlewares)).Methods("GET")

	// API for File management
	router = r.PathPrefix(WithBase("/api/files")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SessionStart, LoggedInOnly, PluginInjector}
	router.HandleFunc("/cat", NewMiddlewareChain(files.FileCat, middlewares)).Methods("GET", "HEAD")
	router.HandleFunc("/zip", NewMiddlewareChain(files.FileDownloader, middlewares)).Methods("GET")
	router.HandleFunc("/unzip", NewMiddlewareChain(files.FileExtract, middlewares)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, LoggedInOnly, PluginInjector}
	router.HandleFunc("/cat", NewMiddlewareChain(files.FileAccess, middlewares)).Methods("OPTIONS")
	router.HandleFunc("/cat", NewMiddlewareChain(files.FileSave, middlewares)).Methods("POST", "PATCH")
	router.HandleFunc("/save", NewMiddlewareChain(files.FileSave, middlewares)).Methods("POST", "PATCH", "HEAD", "OPTIONS")
	router.HandleFunc("/ls", NewMiddlewareChain(files.FileLs, middlewares)).Methods("GET")
	router.HandleFunc("/mv", NewMiddlewareChain(files.FileMv, middlewares)).Methods("POST")
	router.HandleFunc("/rm", NewMiddlewareChain(files.FileRm, middlewares)).Methods("POST")
	router.HandleFunc("/mkdir", NewMiddlewareChain(files.FileMkdir, middlewares)).Methods("POST")
	router.HandleFunc("/touch", NewMiddlewareChain(files.FileTouch, middlewares)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, LoggedInOnly, PluginInjector}
	router.HandleFunc("/search", NewMiddlewareChain(files.FileSearch, middlewares)).Methods("GET")

	// API for Shared link
	router = r.PathPrefix(WithBase("/api/share")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, LoggedInOnly, PluginInjector}
	router.HandleFunc("", NewMiddlewareChain(share.ShareListHandler, middlewares)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, BodyParser, PluginInjector}
	router.HandleFunc("/{share}/proof", NewMiddlewareChain(share.ShareVerifyProofHandler, middlewares)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, CanManageShare, PluginInjector}
	router.HandleFunc("/{share}", NewMiddlewareChain(share.ShareDeleteHandler, middlewares)).Methods("DELETE")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, BodyParser, CanManageShare, PluginInjector}
	router.HandleFunc("/{share}", NewMiddlewareChain(share.ShareUpsertHandler, middlewares)).Methods("POST")

	router = r.PathPrefix(WithBase("/api/metadata")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, LoggedInOnly, PluginInjector}
	router.HandleFunc("", NewMiddlewareChain(files.MetaGet, middlewares)).Methods("GET")
	router.HandleFunc("", NewMiddlewareChain(files.MetaUpsert, middlewares)).Methods("POST")
	router.HandleFunc("/search", NewMiddlewareChain(files.MetaSearch, middlewares)).Methods("POST")

	// Webdav server / Shared Link
	middlewares = []Middleware{IndexHeaders, SecureHeaders, PluginInjector}
	r.HandleFunc(WithBase("/s/{share}"), NewMiddlewareChain(frontend.ServeFrontofficeHandler, middlewares)).Methods("GET")
	middlewares = []Middleware{share.WebdavBlacklist, SessionStart, PluginInjector}
	r.PathPrefix(WithBase("/s/{share}")).Handler(NewMiddlewareChain(share.WebdavHandler, middlewares))

	// Application Resources
	middlewares = []Middleware{ApiHeaders, SecureHeaders, PluginInjector}
	r.HandleFunc(WithBase("/api/backend"), NewMiddlewareChain(admin.AdminBackend, middlewares)).Methods("GET")
	r.HandleFunc(WithBase("/api/plugin"), NewMiddlewareChain(frontend.PluginExportHandler, append(middlewares, PublicCORS))).Methods("GET", "OPTIONS")
	r.HandleFunc(WithBase("/api/config"), NewMiddlewareChain(frontend.PublicConfigHandler, append(middlewares, PublicCORS))).Methods("GET", "OPTIONS")
	middlewares = []Middleware{StaticHeaders, SecureHeaders, PublicCORS, PluginInjector}
	r.PathPrefix(WithBase("/assets/bundle.js")).Handler(http.HandlerFunc(NewMiddlewareChain(frontend.ServeBundle(), middlewares))).Methods("GET", "OPTIONS")
	r.HandleFunc(WithBase("/assets/"+BUILD_REF+"/plugin/{name}.zip/{path:.+}"), NewMiddlewareChain(frontend.PluginStaticHandler, middlewares)).Methods("GET", "OPTIONS", "HEAD")
	r.HandleFunc(WithBase("/assets/"+BUILD_REF+"/plugin/{name}.zip"), NewMiddlewareChain(frontend.PluginDownloadHandler, middlewares)).Methods("GET")
	r.HandleFunc(WithBase("/assets/plugin/{name}.zip"), NewMiddlewareChain(frontend.PluginDownloadHandler, middlewares)).Methods("GET")
	r.PathPrefix(WithBase("/assets/"+BUILD_REF)).Handler(http.HandlerFunc(NewMiddlewareChain(frontend.ServeFile("/"), middlewares))).Methods("GET", "OPTIONS")
	r.PathPrefix(WithBase("/assets/")).Handler(http.HandlerFunc(NewMiddlewareChain(frontend.ServeFile("/"), middlewares))).Methods("GET", "OPTIONS")
	r.HandleFunc(WithBase("/sw.js"), http.HandlerFunc(NewMiddlewareChain(frontend.ServeFile("/assets/"), middlewares))).Methods("GET")
	r.HandleFunc(WithBase("/favicon.ico"), NewMiddlewareChain(frontend.ServeFavicon, middlewares)).Methods("GET")

	// Other endpoints
	middlewares = []Middleware{ApiHeaders, PluginInjector, PublicCORS}
	r.HandleFunc(WithBase("/report"), NewMiddlewareChain(frontend.ReportHandler, middlewares)).Methods("POST", "OPTIONS")
	middlewares = []Middleware{IndexHeaders, SecureHeaders, PluginInjector}
	r.HandleFunc(WithBase("/about"), NewMiddlewareChain(frontend.AboutHandler, middlewares)).Methods("GET")
	r.HandleFunc(WithBase("/robots.txt"), NewMiddlewareChain(frontend.RobotsHandler, []Middleware{}))
	r.HandleFunc(WithBase("/manifest.json"), NewMiddlewareChain(frontend.ManifestHandler, []Middleware{})).Methods("GET")
	r.HandleFunc(WithBase("/.well-known/security.txt"), NewMiddlewareChain(frontend.WellKnownSecurityHandler, []Middleware{})).Methods("GET")
	r.HandleFunc(WithBase("/healthz"), NewMiddlewareChain(frontend.HealthHandler, []Middleware{})).Methods("GET", "HEAD")
	r.HandleFunc(WithBase("/custom.css"), NewMiddlewareChain(frontend.CustomCssHandler, []Middleware{})).Methods("GET")
}

func CatchAll(r *mux.Router) {
	middlewares := []Middleware{SecureHeaders, PluginInjector}
	r.PathPrefix(WithBase("/admin")).Handler(http.HandlerFunc(NewMiddlewareChain(frontend.ServeBackofficeHandler, middlewares))).Methods("GET")
	middlewares = []Middleware{IndexHeaders, SecureHeaders, PluginInjector}
	r.PathPrefix("/").Handler(http.HandlerFunc(NewMiddlewareChain(frontend.ServeFrontofficeHandler, middlewares))).Methods("GET", "POST")
}

func DebugRoutes(r *mux.Router) {
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

func PluginRoutes(r *mux.Router) {
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
