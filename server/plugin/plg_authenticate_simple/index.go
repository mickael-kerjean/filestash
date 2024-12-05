package plg_authenticate_simple

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/middleware"

	"github.com/gorilla/mux"
)

type User struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
	Disabled bool   `json:"disabled"`
}

type pluginConfig struct {
	DB      string `json:"db"`
	Users   []User `json:"-"`
	Subject string `json:"notification_subject"`
	Body    string `json:"notification_body"`
}

func init() {
	Hooks.Register.AuthenticationMiddleware("simple", SimpleAuth{})
	Hooks.Register.HttpEndpoint(func(r *mux.Router, app *App) error {
		r.Handle("/admin/simple-user-management", http.RedirectHandler("/admin/api/simple-user-management", http.StatusSeeOther)).Methods("GET")
		r.HandleFunc("/admin/api/simple-user-management", middleware.NewMiddlewareChain(
			UserManagementHandler,
			[]Middleware{middleware.AdminOnly},
			*app,
		)).Methods("GET", "POST", "DELETE", "PATCH")
		return nil
	})
}
