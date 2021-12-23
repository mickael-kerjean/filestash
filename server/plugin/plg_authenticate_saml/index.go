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
				Value:       "<VISIT https://www.filestash.app/pricing>",
				Placeholder: "Metadata you need to import onto your IDP",
			},
			{
				Name:        "IDP Metadata",
				Type:        "text",
				ReadOnly:    true,
				Value:       "<VISIT https://www.filestash.app/pricing>",
				Placeholder: "Metadata url given by your IDP",
			},
		},
	}
}

func (this Saml) EntryPoint(req *http.Request, res http.ResponseWriter) {
	http.Redirect(
		res, req,
		"/?error=saml is available for enterprise customer, see https://www.filestash.app/pricing/?modal=enterprise",
		http.StatusTemporaryRedirect,
	)
}

func (this Saml) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return nil, ErrNotImplemented
}
