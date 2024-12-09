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
				Name: "banner",
				Type: "hidden",
				Description: `This enterprise SSO plugin delegates authentication to a SAML compliant Identity Provider (IDP). It exposes the attributes of the authenticated user, which can then be used in the attribute mapping section to create rules tailored to your specific use case. See the [full documentation](https://www.filestash.app/setup-saml.html).
`,
			},
			{
				Name:  "type",
				Type:  "hidden",
				Value: "saml",
			},
			{
				Name:        "IDP Metadata",
				Type:        "long_text",
				Value:       "",
				Placeholder: "Paste the metadata from your IDP",
				Description: `if your IDP asks for some information before giving the metadata file, use these:
- entityID: http://localhost:8334/saml/metadata
- assertionConsumerService (acs): http://localhost:8334/saml/acs
- singleLogoutService (slo): http://localhost:8334/saml/slo`,
			},
			{
				Name:        "SP Metadata",
				Type:        "text",
				ReadOnly:    true,
				Value:       "",
				Placeholder: "visit: /saml/metadata",
				Description: "The metadata file will be available under /saml/metadata once you've entered a valid IDP metadata which should come from your IDP",
			},
		},
	}
}

func (this Saml) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	http.Redirect(
		res, req,
		"https://www.filestash.app/purchase-enterprise-selfhosted.html",
		http.StatusTemporaryRedirect,
	)
	return nil
}

func (this Saml) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return nil, ErrNotImplemented
}
