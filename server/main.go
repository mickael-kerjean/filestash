package main

import (
	_ "embed"
	"fmt"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/ctrl"
	. "github.com/mickael-kerjean/filestash/server/middleware"
	_ "github.com/mickael-kerjean/filestash/server/plugin"
	"net/http"
	"net/http/pprof"
	"os"
	"runtime"
	"runtime/debug"
	"strconv"
	"sync"
)

//go:embed plugin/index.go
var EmbedPluginList []byte

func main() {
	app := App{}
	Init(app)
}

func Init(a App) {
	var (
		r           *mux.Router = mux.NewRouter()
		middlewares []Middleware
	)

	// API for Session
	session := r.PathPrefix("/api/session").Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart}
	session.HandleFunc("", NewMiddlewareChain(SessionGet, middlewares, a)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, RateLimiter, BodyParser}
	session.HandleFunc("", NewMiddlewareChain(SessionAuthenticate, middlewares, a)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin}
	session.HandleFunc("", NewMiddlewareChain(SessionLogout, middlewares, a)).Methods("DELETE")
	middlewares = []Middleware{ApiHeaders, SecureHeaders}
	session.HandleFunc("/auth/{service}", NewMiddlewareChain(SessionOAuthBackend, middlewares, a)).Methods("GET")
	session.HandleFunc("/auth/", NewMiddlewareChain(SessionAuthMiddleware, middlewares, a)).Methods("GET", "POST")

	// API for Admin Console
	admin := r.PathPrefix("/admin/api").Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureOrigin}
	admin.HandleFunc("/session", NewMiddlewareChain(AdminSessionGet, middlewares, a)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureOrigin, RateLimiter}
	admin.HandleFunc("/session", NewMiddlewareChain(AdminSessionAuthenticate, middlewares, a)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, AdminOnly, SecureOrigin}
	admin.HandleFunc("/config", NewMiddlewareChain(PrivateConfigHandler, middlewares, a)).Methods("GET")
	admin.HandleFunc("/config", NewMiddlewareChain(PrivateConfigUpdateHandler, middlewares, a)).Methods("POST")
	admin.HandleFunc("/middlewares/authentication", NewMiddlewareChain(AdminAuthenticationMiddleware, middlewares, a)).Methods("GET")
	admin.HandleFunc("/audit", NewMiddlewareChain(FetchAuditHandler, middlewares, a)).Methods("GET")
	middlewares = []Middleware{IndexHeaders, AdminOnly}
	admin.HandleFunc("/logs", NewMiddlewareChain(FetchLogHandler, middlewares, a)).Methods("GET")

	// API for File management
	files := r.PathPrefix("/api/files").Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, WithPublicAPI, SessionStart, LoggedInOnly}
	files.HandleFunc("/cat", NewMiddlewareChain(FileCat, middlewares, a)).Methods("GET", "HEAD")
	files.HandleFunc("/zip", NewMiddlewareChain(FileDownloader, middlewares, a)).Methods("GET")
	files.HandleFunc("/unzip", NewMiddlewareChain(FileExtract, middlewares, a)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, WithPublicAPI, SessionStart, LoggedInOnly}
	files.HandleFunc("/cat", NewMiddlewareChain(FileAccess, middlewares, a)).Methods("OPTIONS")
	files.HandleFunc("/cat", NewMiddlewareChain(FileSave, middlewares, a)).Methods("POST")
	files.HandleFunc("/ls", NewMiddlewareChain(FileLs, middlewares, a)).Methods("GET")
	files.HandleFunc("/mv", NewMiddlewareChain(FileMv, middlewares, a)).Methods("POST")
	files.HandleFunc("/rm", NewMiddlewareChain(FileRm, middlewares, a)).Methods("POST")
	files.HandleFunc("/mkdir", NewMiddlewareChain(FileMkdir, middlewares, a)).Methods("POST")
	files.HandleFunc("/touch", NewMiddlewareChain(FileTouch, middlewares, a)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, WithPublicAPI, SessionStart, LoggedInOnly}
	files.HandleFunc("/search", NewMiddlewareChain(FileSearch, middlewares, a)).Methods("GET")

	// API for Shared link
	share := r.PathPrefix("/api/share").Subrouter()
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, SessionStart, LoggedInOnly}
	share.HandleFunc("", NewMiddlewareChain(ShareList, middlewares, a)).Methods("GET")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, BodyParser}
	share.HandleFunc("/{share}/proof", NewMiddlewareChain(ShareVerifyProof, middlewares, a)).Methods("POST")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, CanManageShare}
	share.HandleFunc("/{share}", NewMiddlewareChain(ShareDelete, middlewares, a)).Methods("DELETE")
	middlewares = []Middleware{ApiHeaders, SecureHeaders, SecureOrigin, BodyParser, CanManageShare}
	share.HandleFunc("/{share}", NewMiddlewareChain(ShareUpsert, middlewares, a)).Methods("POST")

	// Webdav server / Shared Link
	middlewares = []Middleware{IndexHeaders, SecureHeaders}
	r.HandleFunc("/s/{share}", NewMiddlewareChain(IndexHandler, middlewares, a)).Methods("GET")
	middlewares = []Middleware{WebdavBlacklist, SessionStart}
	r.PathPrefix("/s/{share}").Handler(NewMiddlewareChain(WebdavHandler, middlewares, a))
	middlewares = []Middleware{ApiHeaders, SecureHeaders, RedirectSharedLoginIfNeeded, SessionStart, LoggedInOnly}
	r.PathPrefix("/api/export/{share}/{mtype0}/{mtype1}").Handler(NewMiddlewareChain(FileExport, middlewares, a))

	// Application Resources
	middlewares = []Middleware{ApiHeaders, SecureHeaders}
	r.HandleFunc("/api/config", NewMiddlewareChain(PublicConfigHandler, middlewares, a)).Methods("GET")
	r.HandleFunc("/api/backend", NewMiddlewareChain(AdminBackend, middlewares, a)).Methods("GET")
	middlewares = []Middleware{StaticHeaders, SecureHeaders}
	r.PathPrefix("/assets").Handler(http.HandlerFunc(NewMiddlewareChain(StaticHandler("/"), middlewares, a))).Methods("GET")
	r.HandleFunc("/favicon.ico", NewMiddlewareChain(StaticHandler("/assets/logo/"), middlewares, a)).Methods("GET")
	r.HandleFunc("/sw_cache.js", NewMiddlewareChain(StaticHandler("/assets/worker/"), middlewares, a)).Methods("GET")

	// Other endpoints
	middlewares = []Middleware{ApiHeaders}
	r.HandleFunc("/report", NewMiddlewareChain(ReportHandler, middlewares, a)).Methods("POST")
	middlewares = []Middleware{IndexHeaders, SecureHeaders}
	r.HandleFunc("/about", NewMiddlewareChain(AboutHandler, middlewares, a)).Methods("GET")
	r.HandleFunc("/robots.txt", NewMiddlewareChain(RobotsHandler, []Middleware{}, a))
	r.HandleFunc("/manifest.json", NewMiddlewareChain(ManifestHandler, []Middleware{}, a)).Methods("GET")
	r.HandleFunc("/.well-known/security.txt", NewMiddlewareChain(WellKnownSecurityHandler, []Middleware{}, a)).Methods("GET")
	r.HandleFunc("/healthz", NewMiddlewareChain(HealthHandler, []Middleware{}, a)).Methods("GET")
	r.HandleFunc("/custom.css", NewMiddlewareChain(CustomCssHandler, []Middleware{}, a)).Methods("GET")
	r.PathPrefix("/doc").Handler(NewMiddlewareChain(DocPage, []Middleware{}, a)).Methods("GET", "POST", "PUT", "DELETE", "OPTIONS")

	if os.Getenv("DEBUG") == "true" {
		initDebugRoutes(r)
	}
	initPluginsRoutes(r, &a)

	r.PathPrefix("/admin").Handler(http.HandlerFunc(NewMiddlewareChain(IndexHandler, middlewares, a))).Methods("GET")
	r.PathPrefix("/").Handler(http.HandlerFunc(NewMiddlewareChain(IndexHandler, middlewares, a))).Methods("GET", "POST")

	// Routes are served via plugins to avoid getting stuck with plain HTTP. The idea is to
	// support many more protocols in the future: HTTPS, HTTP2, TOR or whatever that sounds
	// fancy I don't know much when this got written: IPFS, solid, ...
	Log.Info("Filestash %s starting", APP_VERSION)
	if len(Hooks.Get.Starter()) == 0 {
		Log.Warning("No starter plugin available")
		os.Exit(1)
		return
	}
	var wg sync.WaitGroup
	for _, obj := range Hooks.Get.Starter() {
		wg.Add(1)
		go func() {
			obj(r)
			wg.Done()
		}()
	}
	go func() {
		InitPluginList(EmbedPluginList)
		for _, fn := range Hooks.Get.Onload() {
			go fn()
		}
	}()
	wg.Wait()
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
	r.HandleFunc("/overrides/xdg-open.js", func(res http.ResponseWriter, req *http.Request) {
		res.Header().Set("Content-Type", GetMimeType(req.URL.String()))
		res.Write([]byte(`window.overrides["xdg-open"] = function(mime){`))
		openers := Hooks.Get.XDGOpen()
		for i := 0; i < len(openers); i++ {
			res.Write([]byte(openers[i]))
		}
		res.Write([]byte(`return null;}`))
	})
}
