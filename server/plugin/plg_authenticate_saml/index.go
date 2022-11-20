package plg_authenticate_saml

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
)

func init() {
	Hooks.Register.AuthenticationMiddleware("saml", Saml{})
}

type Saml struct{}

func (this Saml) Setup() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "saml",
			},
			{
				Name:        "SP Metadata",
				Type:        "text",
				ReadOnly:    true,
				Placeholder: "plugin available in the enterprise release",
			},
			{
				Name:        "IDP Metadata",
				Type:        "text",
				ReadOnly:    true,
				Placeholder: "plugin available in the enterprise release",
				Description: `This plugin is to integrate with your IDP using SAML Single Sign-On. After having authenticated to your IDP, all the information about the user sent by your IDP will be available in the attribute mapping section either by:
&nbsp;&nbsp;1. copying those attributes in any field: {{ .mail }}, {{ .uid }}, {{ .givenName }}
&nbsp;&nbsp;2. create custom rules based on some attributes like this: {{ if eq .role "admin" }}adminuser{{ else }}regularuser{{ end }}

[Purchase the enterprise edition](https://www.filestash.app/purchase-enterprise-selfhosted.html)`,
			},
		},
	}
}

func (this Saml) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	http.Redirect(
		res, req,
		"/?error=saml is available for enterprise customer, see https://www.filestash.app/pricing/?modal=enterprise",
		http.StatusTemporaryRedirect,
	)
	return nil
}

func (this Saml) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return nil, ErrNotImplemented
}
