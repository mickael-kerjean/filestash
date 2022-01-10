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
				Value:       "",
				Placeholder: "<VISIT https://www.filestash.app/pricing>",
			},
			{
				Name:        "IDP Metadata",
				Type:        "text",
				ReadOnly:    true,
				Value:       "",
				Placeholder: "<VISIT https://www.filestash.app/pricing>",
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
