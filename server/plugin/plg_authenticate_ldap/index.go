package plg_authenticate_ldap

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
)

func init() {
	Hooks.Register.AuthenticationMiddleware("ldap", Ldap{})
}

type Ldap struct{}

func (this Ldap) Setup() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "ldap",
			},
			{
				Name:        "Hostname",
				Type:        "text",
				Value:       "",
				Placeholder: "eg: ldap.example.com",
			},
			{
				Name:        "Port",
				Type:        "text",
				Value:       "",
				Placeholder: "eg: 389",
			},
			{
				Name:        "Bind DN",
				Type:        "text",
				Value:       "",
				Placeholder: "Bind DN",
			},
			{
				Name:        "Bind DN Password",
				Type:        "text",
				Value:       "",
				Placeholder: "Bind CN Password",
			},
			{
				Name:        "Base DN",
				Type:        "text",
				Value:       "",
				Placeholder: "Base DN",
			},
		},
	}
}

func (this Ldap) EntryPoint(req *http.Request, res http.ResponseWriter) {
	http.Redirect(
		res, req,
		"/?error=ldap is available for enterprise customer, see https://www.filestash.app/pricing/?modal=enterprise",
		http.StatusTemporaryRedirect,
	)
}

func (this Ldap) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return nil, ErrNotImplemented
}
