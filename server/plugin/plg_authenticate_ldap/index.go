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
				Name: "banner",
				Type: "hidden",
				Description: `This enterprise SSO plugin delegates authentication to an LDAP server, presenting users with a username and password login page. Their credentials are then verified against your LDAP directory.

The plugin exposes the LDAP attribute of the authenticated users which can be used in the attribute mapping section to create rules tailored to your specific use case, see the documentation [on the website](https://www.filestash.app/setup-ldap.html).
`,
			},
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
				Type:        "password",
				Value:       "",
				Placeholder: "Bind CN Password",
			},
			{
				Name:        "Base DN",
				Type:        "text",
				Value:       "",
				Placeholder: "Base DN",
			},
			{
				Name:        "Search Filter",
				Type:        "text",
				Value:       "",
				Placeholder: "default: (&(objectclass=person)(|(uid={{.username}})(mail={{.username}})(sAMAccountName={{.username}})))",
			},
		},
	}
}

func (this Ldap) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	http.Redirect(
		res, req,
		"https://www.filestash.app/purchase-enterprise-selfhosted.html",
		http.StatusTemporaryRedirect,
	)
	return nil
}

func (this Ldap) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	return nil, ErrNotImplemented
}
