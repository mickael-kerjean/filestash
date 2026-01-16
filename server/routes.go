package server

import (
	"fmt"
	"net/http"
	"net/http/pprof"
	"runtime"
	"runtime/debug"
	"strconv"

	"github.com/gorilla/mux"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/ctrl"
	. "github.com/mickael-kerjean/filestash/server/middleware"
	. "github.com/mickael-kerjean/filestash/server/workflow"
)

func Build(r *mux.Router) {
	var middlewares []Middleware

	// API for Session
	session := r.PathPrefix(WithBase("/api/session")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, PluginInjector}
	session.HandleFunc("", NewMiddlewareChain(SessionGet, middlewares)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, RateLimiter, BodyParser, PluginInjector}
	session.HandleFunc("", NewMiddlewareChain(SessionAuthenticate, middlewares)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, PluginInjector}
	session.HandleFunc("", NewMiddlewareChain(SessionLogout, middlewares)).Methods("DELETE")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, PluginInjector}
	session.HandleFunc("/auth/{service}", NewMiddlewareChain(SessionOAuthBackend, middlewares)).Methods("GET")
	session.HandleFunc("/auth/", NewMiddlewareChain(SessionAuthMiddleware, middlewares)).Methods("GET", "POST")

	// API for Admin Console
	admin := r.PathPrefix(WithBase("/admin/api")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureOrigin, PluginInjector}
	admin.HandleFunc("/session", NewMiddlewareChain(AdminSessionGet, middlewares)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureOrigin, RateLimiter, PluginInjector}
	admin.HandleFunc("/session", NewMiddlewareChain(AdminSessionAuthenticate, middlewares)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, AdminOnly, SecureOrigin, PluginInjector}
	admin.HandleFunc("/config", NewMiddlewareChain(PrivateConfigHandler, middlewares)).Methods("GET")
	admin.HandleFunc("/config", NewMiddlewareChain(PrivateConfigUpdateHandler, middlewares)).Methods("POST")
	admin.HandleFunc("/workflow", NewMiddlewareChain(WorkflowAll, middlewares)).Methods("GET")
	admin.HandleFunc("/workflow/{workflowID}", NewMiddlewareChain(WorkflowGet, middlewares)).Methods("GET")
	admin.HandleFunc("/workflow", NewMiddlewareChain(WorkflowUpsert, middlewares)).Methods("POST")
	admin.HandleFunc("/workflow", NewMiddlewareChain(WorkflowDelete, middlewares)).Methods("DELETE")
	admin.HandleFunc("/middlewares/authentication", NewMiddlewareChain(AdminAuthenticationMiddleware, middlewares)).Methods("GET")
	admin.HandleFunc("/audit", NewMiddlewareChain(FetchAuditHandler, middlewares)).Methods("GET")
	middlewares = []Middleware{IndexHeaders, AdminOnly, PluginInjector}
	admin.HandleFunc("/logs", NewMiddlewareChain(FetchLogHandler, middlewares)).Methods("GET")

	// API for File management
	files := r.PathPrefix(WithBase("/api/files")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SessionStart, LoggedInOnly, PluginInjector}
	files.HandleFunc("/cat", NewMiddlewareChain(FileCat, middlewares)).Methods("GET", "HEAD")
	files.HandleFunc("/zip", NewMiddlewareChain(FileDownloader, middlewares)).Methods("GET")
	files.HandleFunc("/unzip", NewMiddlewareChain(FileExtract, middlewares)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, LoggedInOnly, PluginInjector}
	files.HandleFunc("/cat", NewMiddlewareChain(FileAccess, middlewares)).Methods("OPTIONS")
	files.HandleFunc("/cat", NewMiddlewareChain(FileSave, middlewares)).Methods("POST", "PATCH")
	files.HandleFunc("/ls", NewMiddlewareChain(FileLs, middlewares)).Methods("GET")
	files.HandleFunc("/mv", NewMiddlewareChain(FileMv, middlewares)).Methods("POST")
	files.HandleFunc("/rm", NewMiddlewareChain(FileRm, middlewares)).Methods("POST")
	files.HandleFunc("/mkdir", NewMiddlewareChain(FileMkdir, middlewares)).Methods("POST")
	files.HandleFunc("/touch", NewMiddlewareChain(FileTouch, middlewares)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, LoggedInOnly, PluginInjector}
	files.HandleFunc("/search", NewMiddlewareChain(FileSearch, middlewares)).Methods("GET")

	// API for Shared link
	share := r.PathPrefix(WithBase("/api/share")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, LoggedInOnly, PluginInjector}
	share.HandleFunc("", NewMiddlewareChain(ShareList, middlewares)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, BodyParser, PluginInjector}
	share.HandleFunc("/{share}/proof", NewMiddlewareChain(ShareVerifyProof, middlewares)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, CanManageShare, PluginInjector}
	share.HandleFunc("/{share}", NewMiddlewareChain(ShareDelete, middlewares)).Methods("DELETE")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, BodyParser, CanManageShare, PluginInjector}
	share.HandleFunc("/{share}", NewMiddlewareChain(ShareUpsert, middlewares)).Methods("POST")

	meta := r.PathPrefix(WithBase("/api/metadata")).Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, LoggedInOnly, PluginInjector}
	meta.HandleFunc("", NewMiddlewareChain(MetaGet, middlewares)).Methods("GET")
	meta.HandleFunc("", NewMiddlewareChain(MetaUpsert, middlewares)).Methods("POST")
	meta.HandleFunc("/search", NewMiddlewareChain(MetaSearch, middlewares)).Methods("POST")

	// Webdav server / Shared Link
	middlewares = []Middleware{IndexHeaders, SecureHeaders, PluginInjector}
	r.HandleFunc(WithBase("/s/{share}"), NewMiddlewareChain(ServeFrontofficeHandler, middlewares)).Methods("GET")
	middlewares = []Middleware{WebdavBlacklist, SessionStart, PluginInjector}
	r.PathPrefix(WithBase("/s/{share}")).Handler(NewMiddlewareChain(WebdavHandler, middlewares))

	// Application Resources
	middlewares = []Middleware{ApiHeaders, SecureHeaders, PluginInjector}
	r.HandleFunc(WithBase("/api/backend"), NewMiddlewareChain(AdminBackend, middlewares)).Methods("GET")
	r.HandleFunc(WithBase("/api/plugin"), NewMiddlewareChain(PluginExportHandler, append(middlewares, PublicCORS))).Methods("GET", "OPTIONS")
	r.HandleFunc(WithBase("/api/config"), NewMiddlewareChain(PublicConfigHandler, append(middlewares, PublicCORS))).Methods("GET", "OPTIONS")
	middlewares = []Middleware{StaticHeaders, SecureHeaders, PublicCORS, PluginInjector}
	r.PathPrefix(WithBase("/assets/bundle.js")).Handler(http.HandlerFunc(NewMiddlewareChain(ServeBundle(), middlewares))).Methods("GET", "OPTIONS")
	r.HandleFunc(WithBase("/assets/"+BUILD_REF+"/plugin/{name}.zip/{path:.+}"), NewMiddlewareChain(PluginStaticHandler, middlewares)).Methods("GET", "OPTIONS", "HEAD")
	r.HandleFunc(WithBase("/assets/"+BUILD_REF+"/plugin/{name}.zip"), NewMiddlewareChain(PluginDownloadHandler, middlewares)).Methods("GET")
	r.HandleFunc(WithBase("/assets/plugin/{name}.zip"), NewMiddlewareChain(PluginDownloadHandler, middlewares)).Methods("GET")
	r.PathPrefix(WithBase("/assets/"+BUILD_REF)).Handler(http.HandlerFunc(NewMiddlewareChain(ServeFile("/"), middlewares))).Methods("GET", "OPTIONS")
	r.PathPrefix(WithBase("/assets/")).Handler(http.HandlerFunc(NewMiddlewareChain(ServeFile("/"), middlewares))).Methods("GET", "OPTIONS")
	r.HandleFunc(WithBase("/sw.js"), http.HandlerFunc(NewMiddlewareChain(ServeFile("/assets/"), middlewares))).Methods("GET")
	r.HandleFunc(WithBase("/favicon.ico"), NewMiddlewareChain(ServeFavicon, middlewares)).Methods("GET")

	// Other endpoints
	middlewares = []Middleware{ApiHeaders, PluginInjector, PublicCORS}
	r.HandleFunc(WithBase("/report"), NewMiddlewareChain(ReportHandler, middlewares)).Methods("POST", "OPTIONS")
	middlewares = []Middleware{IndexHeaders, SecureHeaders, PluginInjector}
	r.HandleFunc(WithBase("/about"), NewMiddlewareChain(AboutHandler, middlewares)).Methods("GET")
	r.HandleFunc(WithBase("/robots.txt"), NewMiddlewareChain(RobotsHandler, []Middleware{}))
	r.HandleFunc(WithBase("/manifest.json"), NewMiddlewareChain(ManifestHandler, []Middleware{})).Methods("GET")
	r.HandleFunc(WithBase("/.well-known/security.txt"), NewMiddlewareChain(WellKnownSecurityHandler, []Middleware{})).Methods("GET")
	r.HandleFunc(WithBase("/healthz"), NewMiddlewareChain(HealthHandler, []Middleware{})).Methods("GET", "HEAD")
	r.HandleFunc(WithBase("/custom.css"), NewMiddlewareChain(CustomCssHandler, []Middleware{})).Methods("GET")
}

func CatchAll(r *mux.Router) {
	middlewares := []Middleware{SecureHeaders, PluginInjector}
	r.PathPrefix(WithBase("/admin")).Handler(http.HandlerFunc(NewMiddlewareChain(ServeBackofficeHandler, middlewares))).Methods("GET")
	middlewares = []Middleware{IndexHeaders, SecureHeaders, PluginInjector}
	r.PathPrefix("/").Handler(http.HandlerFunc(NewMiddlewareChain(ServeFrontofficeHandler, middlewares))).Methods("GET", "POST")
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
