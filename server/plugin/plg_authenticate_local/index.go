package plg_authenticate_local

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/middleware"

	"github.com/gorilla/mux"
)

func init() {
	Hooks.Register.AuthenticationMiddleware("local", SimpleAuth{})
	Hooks.Register.HttpEndpoint(func(r *mux.Router, app *App) error {
		r.Handle(WithBase("/admin/simple-user-management"), http.RedirectHandler(WithBase("/admin/api/simple-user-management"), http.StatusSeeOther)).Methods("GET")
		r.HandleFunc(WithBase("/admin/api/simple-user-management"), middleware.NewMiddlewareChain(
			UserManagementHandler,
			[]Middleware{middleware.AdminOnly},
			*app,
		)).Methods("GET", "POST", "DELETE", "PATCH")
		return nil
	})
}

type User struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
	Disabled bool   `json:"disabled"`

	Code string `json:"-"`
	MFA  string `json:"mfa"`
}

type pluginConfig struct {
	DB      string `json:"db"`
	MFA     string `json:"mfa"`
	Users   []User `json:"-"`
	Subject string `json:"notification_subject"`
	Body    string `json:"notification_body"`
}
