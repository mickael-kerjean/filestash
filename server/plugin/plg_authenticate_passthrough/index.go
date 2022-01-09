package plg_authenticate_passthrough

import (
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
				Name:     "hint",
				Type:     "text",
				ReadOnly: true,
				Value:    "You will be redirected to the selected backend",
			},
		},
	}
}

func (this Admin) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	res.Header().Set("Content-Type", "text/html; charset=utf-8")
	res.WriteHeader(http.StatusOK)
	res.Write([]byte(Page(`<h2 style="display:none;">PASSTHROUGH</h2><script>location.href = "/api/session/auth/"</script>`)))
	return nil
}

func (this Admin) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return map[string]string{}, nil
}
