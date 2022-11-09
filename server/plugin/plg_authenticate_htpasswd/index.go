package plg_authenticate_passthrough

import (
	"fmt"
	auth "github.com/abbot/go-http-auth"
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
	"strings"
)

func init() {
	Hooks.Register.AuthenticationMiddleware("htpasswd", Htpasswd{})
}

type Htpasswd struct{}

func (this Htpasswd) Setup() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "htpasswd",
			},
			{
				Name:        "users",
				Type:        "long_text",
				Placeholder: "test:$apr1$nEDlyMK/$4jL0BUAuEifz2VajdjVnE.\ntest:{SHA}qUqP5cyxm6YcTAhz05Hph5gvu9M=",
				Default:     "",
				Description: `The list of users who are granted access using the htpasswd file format.
This plugin exposes {{ .user }} and {{ .password }} for the attribute mapping section`,
			},
		},
	}
}

func (this Htpasswd) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
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
      <form action="/api/session/auth/" method="post" class="component_middleware">
        <label>
          <input type="text" name="user" value="" placeholder="User" />
        </label>
        <label>
          <input type="password" name="password" value="" placeholder="Password" />
        </label>
        <button>CONNECT</button>
        ` + getFlash() + `
        <style>.flash{ color: #f26d6d; font-weight: bold; }</style>
      </form>`)))
	return nil
}

func (this Htpasswd) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	if idpParams["users"] == "" {
		Log.Error("plg_authenticate_htpasswd::callback there is no user configured")
		return nil, NewError("You haven't configured any users", 500)
	}
	lines := strings.Split(idpParams["users"], "\n")
	for _, line := range lines {
		pair := strings.SplitN(line, ":", 2)
		if len(pair) != 2 {
			continue
		} else if formData["user"] != pair[0] {
			continue
		} else if auth.CheckSecret(formData["password"], pair[1]) == false {
			continue
		}
		return map[string]string{
			"user":     formData["user"],
			"password": formData["password"],
		}, nil
	}
	http.SetCookie(res, &http.Cookie{
		Name:   "flash",
		Value:  "Invalid username or password",
		MaxAge: 1,
		Path:   "/",
	})
	return nil, ErrAuthenticationFailed
}
