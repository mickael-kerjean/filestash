package main

import (
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/nuage/server/common"
	. "github.com/mickael-kerjean/nuage/server/ctrl"
	. "github.com/mickael-kerjean/nuage/server/middleware"
	_ "github.com/mickael-kerjean/nuage/server/plugin"
	"net/http"
    "net/http/pprof"
	"os"
	"runtime/debug"
	"strconv"
)

func main() {
	app := App{}
	Init(&app)
}

func Init(a *App) {
	var middlewares []Middleware
	r := mux.NewRouter()

	// Profiling - handy to identify nasty leaks and/or bugs!
	if os.Getenv("DEBUG") == "true" {
		r.HandleFunc("/debug/pprof/", pprof.Index)
		r.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
		r.HandleFunc("/debug/pprof/profile", pprof.Profile)
		r.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
		r.HandleFunc("/debug/pprof/trace", pprof.Trace)
		r.Handle("/debug/pprof/goroutine", pprof.Handler("goroutine"))
		r.Handle("/debug/pprof/heap", pprof.Handler("heap"))
		r.Handle("/debug/pprof/threadcreate", pprof.Handler("threadcreate"))
		r.Handle("/debug/pprof/block", pprof.Handler("block"))
		r.HandleFunc("/debug/free", func(w http.ResponseWriter, r *http.Request) {
			debug.FreeOSMemory()
			w.Write([]byte("DONE"))
		})
	}

	// API for Session
	session := r.PathPrefix("/api/session").Subrouter()
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SessionStart }
	session.HandleFunc("",                NewMiddlewareChain(SessionGet,          middlewares, *a)).Methods("GET")
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, BodyParser }
	session.HandleFunc("",                NewMiddlewareChain(SessionAuthenticate, middlewares, *a)).Methods("POST")
	middlewares = []Middleware{ ApiHeaders, SecureHeaders }
	session.HandleFunc("",                NewMiddlewareChain(SessionLogout,       middlewares, *a)).Methods("DELETE")
	session.HandleFunc("/auth/{service}", NewMiddlewareChain(SessionOAuthBackend, middlewares, *a)).Methods("GET")

	// API for admin
	middlewares = []Middleware{ ApiHeaders }
	admin := r.PathPrefix("/admin/api").Subrouter()
	admin.HandleFunc("/session", NewMiddlewareChain(AdminSessionGet,            middlewares, *a)).Methods("GET")
	admin.HandleFunc("/session", NewMiddlewareChain(AdminSessionAuthenticate,   middlewares, *a)).Methods("POST")
	middlewares = []Middleware{ ApiHeaders, AdminOnly }
	admin.HandleFunc("/plugin",  NewMiddlewareChain(FetchPluginsHandler,        middlewares, *a)).Methods("GET")
	admin.HandleFunc("/log",     NewMiddlewareChain(FetchLogHandler,            middlewares, *a)).Methods("GET")
	admin.HandleFunc("/config",  NewMiddlewareChain(PrivateConfigHandler,       middlewares, *a)).Methods("GET")
	admin.HandleFunc("/config",  NewMiddlewareChain(PrivateConfigUpdateHandler, middlewares, *a)).Methods("POST")
	middlewares = []Middleware{ IndexHeaders }
	r.PathPrefix("/admin").Handler(http.HandlerFunc(NewMiddlewareChain(IndexHandler(FILE_INDEX), middlewares, *a))).Methods("GET")


	// API for File management
	files := r.PathPrefix("/api/files").Subrouter()
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SessionStart, LoggedInOnly }
	files.HandleFunc("/ls",    NewMiddlewareChain(FileLs,    middlewares, *a)).Methods("GET")
	files.HandleFunc("/cat",   NewMiddlewareChain(FileCat,   middlewares, *a)).Methods("GET")
	files.HandleFunc("/cat",   NewMiddlewareChain(FileSave,  middlewares, *a)).Methods("POST")
	files.HandleFunc("/mv",    NewMiddlewareChain(FileMv,    middlewares, *a)).Methods("GET")
	files.HandleFunc("/rm",    NewMiddlewareChain(FileRm,    middlewares, *a)).Methods("GET")
	files.HandleFunc("/mkdir", NewMiddlewareChain(FileMkdir, middlewares, *a)).Methods("GET")
	files.HandleFunc("/touch", NewMiddlewareChain(FileTouch, middlewares, *a)).Methods("GET")

	// API for Shared link
	share := r.PathPrefix("/api/share").Subrouter()
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SessionStart, LoggedInOnly }
	share.HandleFunc("",               NewMiddlewareChain(ShareList,        middlewares, *a)).Methods("GET")
	share.HandleFunc("/{share}",       NewMiddlewareChain(ShareDelete,      middlewares, *a)).Methods("DELETE")
	middlewares = []Middleware{ ApiHeaders, SecureHeaders, SessionStart, BodyParser, LoggedInOnly }
	share.HandleFunc("/{share}",       NewMiddlewareChain(ShareUpsert,      middlewares, *a)).Methods("POST")
	share.HandleFunc("/{share}/proof", NewMiddlewareChain(ShareVerifyProof, middlewares, *a)).Methods("POST")

	// Webdav server / Shared Link
	middlewares = []Middleware{ IndexHeaders, SecureHeaders }
	r.HandleFunc("/s/{share}",         NewMiddlewareChain(IndexHandler(FILE_INDEX), middlewares, *a)).Methods("GET")
	middlewares = []Middleware{ SessionStart }
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
	middlewares = []Middleware{ IndexHeaders, SecureHeaders }
	r.HandleFunc("/about",                     NewMiddlewareChain(AboutHandler,                      middlewares, *a)).Methods("GET")
	r.PathPrefix("/").Handler(http.HandlerFunc(NewMiddlewareChain(IndexHandler(FILE_INDEX),          middlewares, *a))).Methods("GET")

	srv := &http.Server{
		Addr:    ":" + strconv.Itoa(Config.Get("general.port").Int()),
		Handler: r,
	}

	Log.Stdout("STARTING SERVER")
	if err := srv.ListenAndServe(); err != nil {
		Log.Stdout("Server start: %v", err)
		return
	}
}
