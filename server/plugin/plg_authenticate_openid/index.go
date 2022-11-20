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
				Placeholder: "plugin available in the enterprise release",
			},
			{
				Name:        "Client ID",
				Type:        "text",
				ReadOnly:    true,
				Placeholder: "plugin available in the enterprise release",
			},
			{
				Name:        "Scope",
				Type:        "text",
				ReadOnly:    true,
				Placeholder: "plugin available in the enterprise release",
				Description: `This plugin is to integrate with your IDP using SSO via OpenID. After having authenticated to your IDP, all the information related to the user will be available in the attribute mapping section like this: {{ .email }} {{ .name }} {{ .sub }}, ...

[Purchase the enterprise edition](https://www.filestash.app/purchase-enterprise-selfhosted.html)`,
			},
		},
	}
}

func (this OpenID) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	http.Redirect(
		res, req,
		"/?error=oidc is available for enterprise customer, see https://www.filestash.app/pricing/?modal=enterprise",
		http.StatusTemporaryRedirect,
	)
	return nil
}

func (this OpenID) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return nil, ErrNotImplemented
}
