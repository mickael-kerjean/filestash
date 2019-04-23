package main

import (
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
	"time"
)

func main() {
	app := App{}
	Init(&app)
}

func Init(a *App) {
	var middlewares []Middleware
	r := mux.NewRouter()

	if os.Getenv("DEBUG") == "true" {
		initDebugRoutes(r)
	}

	// API for Session
	session := r.PathPrefix("/api/session").Subrouter()
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SecureAjax, SessionStart }
	session.HandleFunc("",                NewMiddlewareChain(SessionGet,          middlewares, *a)).Methods("GET")
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SecureAjax, BodyParser }
	session.HandleFunc("",                NewMiddlewareChain(SessionAuthenticate, middlewares, *a)).Methods("POST")
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SecureAjax, SessionTry }
	session.HandleFunc("",                NewMiddlewareChain(SessionLogout,       middlewares, *a)).Methods("DELETE")
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SecureAjax }
	session.HandleFunc("/auth/{service}", NewMiddlewareChain(SessionOAuthBackend, middlewares, *a)).Methods("GET")

	// API for admin
	middlewares = []Middleware{ ApiHeaders, SecureAjax }
	admin := r.PathPrefix("/admin/api").Subrouter()
	admin.HandleFunc("/session", NewMiddlewareChain(AdminSessionGet,            middlewares, *a)).Methods("GET")
	admin.HandleFunc("/session", NewMiddlewareChain(AdminSessionAuthenticate,   middlewares, *a)).Methods("POST")
	middlewares = []Middleware{ ApiHeaders, AdminOnly, SecureAjax }
	admin.HandleFunc("/plugin",  NewMiddlewareChain(FetchPluginsHandler,        middlewares, *a)).Methods("GET")
	admin.HandleFunc("/config",  NewMiddlewareChain(PrivateConfigHandler,       middlewares, *a)).Methods("GET")
	admin.HandleFunc("/config",  NewMiddlewareChain(PrivateConfigUpdateHandler, middlewares, *a)).Methods("POST")
	middlewares = []Middleware{ IndexHeaders }
	admin.HandleFunc("/log",                        NewMiddlewareChain(FetchLogHandler,          middlewares, *a)).Methods("GET")
	r.PathPrefix("/admin").Handler(http.HandlerFunc(NewMiddlewareChain(IndexHandler(FILE_INDEX), middlewares, *a))).Methods("GET")

	// API for File management
	files := r.PathPrefix("/api/files").Subrouter()
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SessionStart, LoggedInOnly }
	files.HandleFunc("/cat",    NewMiddlewareChain(FileCat,    middlewares, *a)).Methods("GET", "HEAD")
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SecureAjax, SessionStart, LoggedInOnly }
	files.HandleFunc("/cat",    NewMiddlewareChain(FileAccess, middlewares, *a)).Methods("OPTIONS")
	files.HandleFunc("/cat",    NewMiddlewareChain(FileSave,   middlewares, *a)).Methods("POST")
	files.HandleFunc("/ls",     NewMiddlewareChain(FileLs,     middlewares, *a)).Methods("GET")
	files.HandleFunc("/mv",     NewMiddlewareChain(FileMv,     middlewares, *a)).Methods("GET")
	files.HandleFunc("/rm",     NewMiddlewareChain(FileRm,     middlewares, *a)).Methods("GET")
	files.HandleFunc("/mkdir",  NewMiddlewareChain(FileMkdir,  middlewares, *a)).Methods("GET")
	files.HandleFunc("/touch",  NewMiddlewareChain(FileTouch,  middlewares, *a)).Methods("GET")
	middlewares = []Middleware{ ApiHeaders, SessionStart, LoggedInOnly }
	files.HandleFunc("/search",  NewMiddlewareChain(FileSearch,  middlewares, *a)).Methods("GET")

	// API for exporter
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, RedirectSharedLoginIfNeeded, SessionStart, LoggedInOnly }
	r.PathPrefix("/api/export/{share}/{mtype0}/{mtype1}").Handler(NewMiddlewareChain(FileExport,  middlewares, *a))

	// API for Shared link
	share := r.PathPrefix("/api/share").Subrouter()
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SecureAjax, SessionStart, LoggedInOnly }
	share.HandleFunc("",               NewMiddlewareChain(ShareList,        middlewares, *a)).Methods("GET")
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SecureAjax, BodyParser }
	share.HandleFunc("/{share}/proof", NewMiddlewareChain(ShareVerifyProof, middlewares, *a)).Methods("POST")
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SecureAjax, CanManageShare }
	share.HandleFunc("/{share}",       NewMiddlewareChain(ShareDelete,      middlewares, *a)).Methods("DELETE")
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SecureAjax, BodyParser, CanManageShare }
	share.HandleFunc("/{share}",       NewMiddlewareChain(ShareUpsert,      middlewares, *a)).Methods("POST")

	// Webdav server / Shared Link
	middlewares = []Middleware{ IndexHeaders, SecureHeaders }
	r.HandleFunc("/s/{share}",         NewMiddlewareChain(IndexHandler(FILE_INDEX), middlewares, *a)).Methods("GET")
	middlewares = []Middleware{ WebdavBlacklist, SessionStart }
	r.PathPrefix("/s/{share}").Handler(NewMiddlewareChain(WebdavHandler,            middlewares, *a))

	// Application Resources
	middlewares = []Middleware{ ApiHeaders }
	r.HandleFunc("/api/config",  NewMiddlewareChain(PublicConfigHandler,                             middlewares, *a)).Methods("GET")
	r.HandleFunc("/api/backend", NewMiddlewareChain(AdminBackend,                                    middlewares, *a)).Methods("GET")
	middlewares = []Middleware{ StaticHeaders }
	r.PathPrefix("/assets").Handler(http.HandlerFunc(NewMiddlewareChain(StaticHandler(FILE_ASSETS),  middlewares, *a))).Methods("GET")
	r.HandleFunc("/favicon.ico", func(res http.ResponseWriter, req *http.Request) {
		http.Redirect(res, req, "/assets/logo/favicon.ico", http.StatusMovedPermanently)
	})
	middlewares = []Middleware{ IndexHeaders }
	r.HandleFunc("/about",                     NewMiddlewareChain(AboutHandler,                      middlewares, *a)).Methods("GET")
	for _, obj := range Hooks.Get.HttpEndpoint() {
		obj(r)
	}
	r.HandleFunc("/robots.txt", func(res http.ResponseWriter, req *http.Request) {
		res.Write([]byte(""))
	})
	r.PathPrefix("/").Handler(http.HandlerFunc(NewMiddlewareChain(IndexHandler(FILE_INDEX),          middlewares, *a))).Methods("GET")

	port := Config.Get("general.port").Int()
	srv := &http.Server{
		Addr:    ":" + strconv.Itoa(port),
		Handler: r,
	}
	Log.Stdout("Filestash %s: starting", APP_VERSION)
	go ensureAppHasBooted(fmt.Sprintf("http://localhost:%d/about", port), fmt.Sprintf("listening on :%d", port))
	if err := srv.ListenAndServe(); err != nil {
		Log.Stdout("error: %v", err)
		return
	}
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

func ensureAppHasBooted(address string, message string) {
	i := 0
	for {
		if i > 10 {
			Log.Warning("Filestash hasn't boot ?!?")
			break
		}
		time.Sleep(250 * time.Millisecond)
		res, err := http.Get(address)
		if err != nil {
			i += 1
			continue
		}
		res.Body.Close()
		if res.StatusCode != http.StatusOK {
			i += 1
			continue
		}
		Log.Stdout(message)
		break
	}
}
