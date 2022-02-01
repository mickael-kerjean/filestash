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
				Name:     "hint",
				Type:     "text",
				ReadOnly: true,
				Value:    "You will be ask for your Filestash admin password",
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
		return fmt.Sprintf("<strong>%s</strong>", c.Value)
	}
	res.Header().Set("Content-Type", "text/html; charset=utf-8")
	res.WriteHeader(http.StatusOK)
	res.Write([]byte(Page(`
      <form action="/api/session/auth/" method="post">
        <label> ` + getFlash() + `
          <input type="password" name="password" value="" placeholder="Admin Password" />
        </label>
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
		"username": "admin",
	}, nil
}
