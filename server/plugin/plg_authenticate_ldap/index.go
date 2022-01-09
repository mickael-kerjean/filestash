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
				ReadOnly:    true,
				Placeholder: "<VISIT https://www.filestash.app/pricing>",
			},
			{
				Name:        "Port",
				Type:        "text",
				Value:       "",
				ReadOnly:    true,
				Placeholder: "<VISIT https://www.filestash.app/pricing>",
			},
			{
				Name:        "Bind DN",
				Type:        "text",
				Value:       "",
				ReadOnly:    true,
				Placeholder: "<VISIT https://www.filestash.app/pricing>",
			},
			{
				Name:        "Bind DN Password",
				Type:        "text",
				Value:       "",
				ReadOnly:    true,
				Placeholder: "<VISIT https://www.filestash.app/pricing>",
			},
			{
				Name:        "Base DN",
				Type:        "text",
				Value:       "",
				ReadOnly:    true,
				Placeholder: "<VISIT https://www.filestash.app/pricing>",
			},
		},
	}
}

func (this Ldap) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	http.Redirect(
		res, req,
		"/?error=ldap is available for enterprise customer, see https://www.filestash.app/pricing/?modal=enterprise",
		http.StatusTemporaryRedirect,
	)
	return nil
}

func (this Ldap) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return nil, ErrNotImplemented
}
