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
				Name: "banner",
				Type: "hidden",
				Description: `This enterprise SSO plugin delegates authentication to an OIDC compliant Identity Provider (IDP). It exposes the attributes of the authenticated user, which can then be used in the attribute mapping section to create rules tailored to your specific use case. See the [full documentation](https://www.filestash.app/setup-oidc.html).
`,
			},
			{
				Name:  "type",
				Type:  "hidden",
				Value: "openid",
			},
			{
				Name:        "OpenID Config URL",
				Type:        "text",
				Value:       "",
				Placeholder: "OpenID Config URL",
				Description: "The OpenID Configuration URL is given by your IDP. Eg: google (https://accounts.google.com/.well-known/openid-configuration), facebook (https://www.facebook.com/.well-known/openid-configuration/), keycloak (http://127.0.0.1:8080/realms/master/.well-known/openid-configuration), ...",
			},
			{
				Name:        "Client ID",
				Type:        "text",
				Value:       "",
				Placeholder: "ClientID provided by your identity provider",
			},
			{
				Name:        "Client Secret",
				Type:        "text",
				Value:       "",
				Placeholder: "ClientSecret provided by your identity provider",
			},
			{
				Name:        "Scope",
				Type:        "text",
				Value:       "",
				Placeholder: "OpenID Scope. Default: 'openid'",
				Default:     "openid",
			},
		},
	}
}

func (this OpenID) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	http.Redirect(
		res, req,
		"https://www.filestash.app/purchase-enterprise-selfhosted.html",
		http.StatusTemporaryRedirect,
	)
	return nil
}

func (this OpenID) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return nil, ErrNotImplemented
}
