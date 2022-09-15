/*
 * This plugin expose syncthing to the admin user
 */
package plg_handler_syncthing

import (
	"encoding/base64"
	"fmt"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"
)

const SYNCTHING_URI = "/admin/syncthing"

func init() {
	plugin_enable := Config.Get("features.syncthing.enable").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "enable"
		f.Type = "enable"
		f.Target = []string{"syncthing_server_url"}
		f.Description = "Enable/Disable integration with the syncthing server. This will make your syncthing server available at `/admin/syncthing`"
		f.Default = false
		if u := os.Getenv("SYNCTHING_URL"); u != "" {
			f.Default = true
		}
		return f
	}).Bool()
	Config.Get("features.syncthing.server_url").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "syncthing_server_url"
		f.Name = "server_url"
		f.Type = "text"
		f.Description = "Location of your Syncthing server"
		f.Default = ""
		f.Placeholder = "Eg: http://127.0.0.1:8080"
		if u := os.Getenv("SYNCTHING_URL"); u != "" {
			f.Default = u
			f.Placeholder = fmt.Sprintf("Default: '%s'", u)
		}
		return f
	})

	Hooks.Register.HttpEndpoint(func(r *mux.Router, _ *App) error {
		if plugin_enable == false {
			return nil
		}
		r.HandleFunc(SYNCTHING_URI, func(res http.ResponseWriter, req *http.Request) {
			http.Redirect(res, req, Config.Get("general.sub_folder").String() + SYNCTHING_URI+"/", http.StatusTemporaryRedirect)
		})
		r.Handle(SYNCTHING_URI+"/", AuthBasic(
			func() (string, string) { return "admin", Config.Get("auth.admin").String() },
			http.HandlerFunc(SyncthingProxyHandler),
		))

		r.PathPrefix(SYNCTHING_URI + "/").HandlerFunc(SyncthingProxyHandler)
		return nil
	})
}

func AuthBasic(credentials func() (string, string), fn http.Handler) http.HandlerFunc {
	var notAuthorised = func(res http.ResponseWriter, req *http.Request) {
		time.Sleep(1 * time.Second)
		res.Header().Set("WWW-Authenticate", `Basic realm="User protect", charset="UTF-8"`)
		res.WriteHeader(http.StatusUnauthorized)
		res.Write([]byte("Not Authorised"))
		return
	}

	return func(res http.ResponseWriter, req *http.Request) {
		auth := req.Header.Get("Authorization")
		if strings.HasPrefix(auth, "Basic ") == false {
			notAuthorised(res, req)
			return
		}
		auth = strings.TrimPrefix(auth, "Basic ")
		decoded, err := base64.StdEncoding.DecodeString(auth)
		if err != nil {
			notAuthorised(res, req)
			return
		}
		auth = string(decoded)
		stuffs := strings.Split(auth, ":")
		if len(stuffs) < 2 {
			notAuthorised(res, req)
			return
		}
		username := stuffs[0]
		password := strings.Join(stuffs[1:], ":")
		refUsername, refPassword := credentials()
		if refUsername != username {
			notAuthorised(res, req)
			return
		} else if err = bcrypt.CompareHashAndPassword([]byte(refPassword), []byte(password)); err != nil {
			notAuthorised(res, req)
			return
		}
		fn.ServeHTTP(res, req)
		return
	}
}

func SyncthingProxyHandler(res http.ResponseWriter, req *http.Request) {
	req.URL.Path = strings.TrimPrefix(req.URL.Path, SYNCTHING_URI)
	req.Header.Set("X-Forwarded-Host", req.Host+SYNCTHING_URI)
	req.Header.Set("X-Forwarded-Proto", func() string {
		if scheme := req.Header.Get("X-Forwarded-Proto"); scheme != "" {
			return scheme
		} else if req.TLS != nil {
			return "https"
		}
		return "http"
	}())
	u, err := url.Parse(Config.Get("features.syncthing.server_url").String())
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	reverseProxy := &httputil.ReverseProxy{
		Director: func(rq *http.Request) {
			rq.URL.Scheme = "http"
			rq.URL.Host = u.Host
			rq.URL.Path = func(a, b string) string {
				aslash := strings.HasSuffix(a, "/")
				bslash := strings.HasPrefix(b, "/")
				switch {
				case aslash && bslash:
					return a + b[1:]
				case !aslash && !bslash:
					return a + "/" + b
				}
				return a + b
			}(u.Path, rq.URL.Path)
			if u.RawQuery == "" || rq.URL.RawQuery == "" {
				rq.URL.RawQuery = u.RawQuery + rq.URL.RawQuery
			} else {
				rq.URL.RawQuery = u.RawQuery + "&" + rq.URL.RawQuery
			}
		},
	}
	reverseProxy.ErrorHandler = func(rw http.ResponseWriter, rq *http.Request, err error) {
		Log.Warning("[syncthing] %s", err.Error())
		SendErrorResult(rw, NewError(err.Error(), http.StatusBadGateway))
	}
	reverseProxy.ServeHTTP(res, req)
}
