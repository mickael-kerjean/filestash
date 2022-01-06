package plg_authenticate_admin

import (
	"fmt"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/crypto/bcrypt"
	"net/http"
)

func init() {
	Hooks.Register.AuthenticationMiddleware("admin", Admin{})
	Hooks.Register.HttpEndpoint(LoginPage())
}

type Admin struct{}

func (this Admin) Setup() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "admin",
			},
			{
				Name:     "hint",
				Type:     "text",
				ReadOnly: true,
				Value:    "You will be ask for your Filestash admin password",
			},
		},
	}
}

func (this Admin) EntryPoint(req *http.Request, res http.ResponseWriter) {
	http.Redirect(
		res, req,
		"/admin/plugin/authenticate_admin",
		http.StatusTemporaryRedirect,
	)
}

func LoginPage() func(r *mux.Router, _ *App) error {
	return func(r *mux.Router, _ *App) error {
		r.HandleFunc("/admin/plugin/authenticate_admin", func(w http.ResponseWriter, r *http.Request) {
			getFlash := func() string {
				c, err := r.Cookie("flash")
				if err != nil {
					return ""
				}
				http.SetCookie(w, &http.Cookie{
					Name:   "flash",
					MaxAge: -1,
					Path:   "/",
				})
				return fmt.Sprintf("<strong>%s</strong>", c.Value)
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(Page(`
              <form action="/api/session/auth/" method="post">
               <label> ` + getFlash() + `
                 <input type="password" name="password" value="" placeholder="Admin Password" />
              </label>
            </form>`)))
		})
		return nil
	}
}

func (this Admin) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	if err := bcrypt.CompareHashAndPassword(
		[]byte(Config.Get("auth.admin").String()),
		[]byte(formData["password"]),
	); err != nil {
		http.SetCookie(res, &http.Cookie{
			Name:   "flash",
			Value:  "Invalid password",
			MaxAge: 1,
			Path:   "/",
		})
		return nil, ErrAuthenticationFailed
	}
	return map[string]string{}, nil
}
