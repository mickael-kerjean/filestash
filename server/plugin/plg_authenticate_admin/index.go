package plg_authenticate_admin

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"golang.org/x/crypto/bcrypt"
	"net/http"
)

func init() {
	Hooks.Register.AuthenticationMiddleware("admin", Admin{})
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
				Name:     "password",
				Type:     "text",
				ReadOnly: true,
				Value:    "__YOUR_ADMIN_PASSWORD__",
				Description: `This plugin will redirect the user to a page asking for a password. Only the admin password will be considered valid.
This plugin exposes {{ .user }} (which is 'admin') and {{ .password }} for the attribute mapping section
`,
			},
		},
	}
}

func (this Admin) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	getFlash := func() string {
		c, err := req.Cookie("flash")
		if err != nil {
			return ""
		}
		http.SetCookie(res, &http.Cookie{
			Name:   "flash",
			MaxAge: -1,
			Path:   "/",
		})
		return fmt.Sprintf(`<p class="flash">%s</p>`, c.Value)
	}
	res.Header().Set("Content-Type", "text/html; charset=utf-8")
	res.WriteHeader(http.StatusOK)
	res.Write([]byte(Page(`
      <form action="` + WithBaseUrl("/api/session/auth/") + `" method="post">
        <label>
          <input type="password" name="password" value="" placeholder="Admin Password" />
        </label>
        <button>CONNECT</button>
        ` + getFlash() + `
        <style>
          .flash{ color: #f26d6d; font-weight: bold; }
          form { padding-top: 10vh; }
        </style>
      </form>`)))
	return nil
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
	return map[string]string{
		"user":     "admin",
		"password": formData["password"],
	}, nil
}
