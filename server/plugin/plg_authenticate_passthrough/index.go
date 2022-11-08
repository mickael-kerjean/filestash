package plg_authenticate_passthrough

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
)

func init() {
	Hooks.Register.AuthenticationMiddleware("passthrough", Admin{})
}

type Admin struct{}

func (this Admin) Setup() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "passthrough",
			},
			{
				Name:        "strategy",
				Type:        "select",
				Default:     "direct",
				Opts:        []string{"direct", "password_only", "username_and_password"},
				Id:          "strategy",
				Description: "This plugin has 3 base strategy for authentication. The 'username_and_password' strategy will redirect the user to a page asking for a username and password whose value can be used in the attribute mapping section of the selected storage. The 'password_only' strategy will do the same but instead of asking for both a username and password will only ask for a password and the remaining 'direct' strategy will be a transparent redirect where the user won't be ask for any information\n\nThis plugin will enable 2 variable which can be used in the attribute mapping section, namely {{ .user }} and {{ .password }}",
			},
		},
	}
}

func (this Admin) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	res.Header().Set("Content-Type", "text/html; charset=utf-8")
	switch idpParams["strategy"] {
	case "direct":
		res.WriteHeader(http.StatusOK)
		res.Write([]byte(Page(`<h2 style="display:none;">PASSTHROUGH</h2><script>location.href = "/api/session/auth/"</script>`)))
	case "password_only":
		res.WriteHeader(http.StatusOK)
		res.Write([]byte(Page(`
      <form action="/api/session/auth/" method="post">
        <label>
          <input type="password" name="password" value="" placeholder="Password" />
        </label>
        <button>CONNECT</button>
      </form>`)))
	case "username_and_password":
		res.WriteHeader(http.StatusOK)
		res.Write([]byte(Page(`
      <form action="/api/session/auth/" method="post">
        <label>
          <input type="text" name="user" value="" placeholder="User" />
        </label>
        <label>
          <input type="password" name="password" value="" placeholder="Password" />
        </label>
        <button>CONNECT</button>
      </form>`)))
	default:
		res.WriteHeader(http.StatusNotFound)
		res.Write([]byte(Page(fmt.Sprintf("Unknown strategy: '%s'", idpParams["strategy"]))))
	}
	return nil
}

func (this Admin) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return map[string]string{
		"user":     formData["user"],
		"password": formData["password"],
	}, nil
}
