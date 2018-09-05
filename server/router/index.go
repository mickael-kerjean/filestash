package router

import (
	"github.com/mickael-kerjean/mux"
	. "github.com/mickael-kerjean/nuage/server/common"
	. "github.com/mickael-kerjean/nuage/server/ctrl"
	"log"
	"net/http"
	"strconv"
)

func Init(a *App) *http.Server {
	r := mux.NewRouter()

	session := r.PathPrefix("/api/session").Subrouter()
	session.HandleFunc("", APIHandler(SessionIsValid, *a)).Methods("GET")
	session.HandleFunc("", APIHandler(SessionAuthenticate, *a)).Methods("POST")
	session.HandleFunc("", APIHandler(SessionLogout, *a)).Methods("DELETE")
	session.Handle("/auth/{service}", APIHandler(SessionOAuthBackend, *a)).Methods("GET")

	files := r.PathPrefix("/api/files").Subrouter()
	files.HandleFunc("/ls", APIHandler(LoggedInOnly(FileLs), *a)).Methods("GET")
	files.HandleFunc("/cat", APIHandler(LoggedInOnly(FileCat), *a)).Methods("GET")
	files.HandleFunc("/cat", APIHandler(LoggedInOnly(FileSave), *a)).Methods("POST")
	files.HandleFunc("/mv", APIHandler(LoggedInOnly(FileMv), *a)).Methods("GET")
	files.HandleFunc("/rm", APIHandler(LoggedInOnly(FileRm), *a)).Methods("GET")
	files.HandleFunc("/mkdir", APIHandler(LoggedInOnly(FileMkdir), *a)).Methods("GET")
	files.HandleFunc("/touch", APIHandler(LoggedInOnly(FileTouch), *a)).Methods("GET")

	share := r.PathPrefix("/api/share").Subrouter()
	share.HandleFunc("", APIHandler(ShareList, *a)).Methods("GET")
	share.HandleFunc("/{id}", APIHandler(ShareGet, *a)).Methods("GET")
	share.HandleFunc("/{id}", APIHandler(ShareUpsert, *a)).Methods("POST")
	share.HandleFunc("/{id}", APIHandler(ShareDelete, *a)).Methods("DELETE")

	r.HandleFunc("/api/config", CtxInjector(ConfigHandler, *a))

	r.PathPrefix("/assets").Handler(StaticHandler("./data/public/", *a))
	r.NotFoundHandler = IndexHandler("./data/public/index.html", *a)

	srv := &http.Server{
		Addr:    ":" + strconv.Itoa(a.Config.General.Port),
		Handler: r,
	}
	go func() {
		log.Println("ICI")
		if err := srv.ListenAndServe(); err != nil {
			log.Fatal("SERVER START ERROR ", err)
			return
		}
		log.Println("SERVER START OK")		
	}()
	log.Println("HERE")
	return srv
}
