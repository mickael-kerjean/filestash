package plg_authenticate_openid

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
)

func init() {
	Hooks.Register.AuthenticationMiddleware("openid", OpenID{})
}

type OpenID struct{}

func (this OpenID) Setup() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "openid",
			},
			{
				Name:        "OpenID Config URL",
				Type:        "text",
				ReadOnly:    true,
				Value:       "<VISIT https://www.filestash.app/pricing>",
				Placeholder: "OpenID Configuration URL",
			},
			{
				Name:        "Client ID",
				Type:        "text",
				ReadOnly:    true,
				Value:       "<VISIT https://www.filestash.app/pricing>",
				Placeholder: "Client ID",
			},
			{
				Name:        "Scope",
				Type:        "text",
				ReadOnly:    true,
				Value:       "<VISIT https://www.filestash.app/pricing>",
				Placeholder: "OpenID Scope: default 'openid'",
			},
		},
	}
}

func (this OpenID) EntryPoint(req *http.Request, res http.ResponseWriter) {
	http.Redirect(
		res, req,
		"/?error=oidc is available for enterprise customer, see https://www.filestash.app/pricing/?modal=enterprise",
		http.StatusTemporaryRedirect,
	)
}

func (this OpenID) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return nil, ErrNotImplemented
}
