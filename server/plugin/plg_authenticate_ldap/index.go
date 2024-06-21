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
				ReadOnly:    true,
				Placeholder: "plugin available in the enterprise release",
			},
			{
				Name:        "Port",
				Type:        "text",
				ReadOnly:    true,
				Placeholder: "plugin available in the enterprise release",
			},
			{
				Name:        "Bind DN",
				Type:        "text",
				ReadOnly:    true,
				Placeholder: "plugin available in the enterprise release",
			},
			{
				Name:        "Bind DN Password",
				Type:        "text",
				ReadOnly:    true,
				Placeholder: "plugin available in the enterprise release",
			},
			{
				Name:        "Base DN",
				Type:        "text",
				ReadOnly:    true,
				Placeholder: "plugin available in the enterprise release",
				Description: `This plugin is to integrate with your LDAP server. After successfully authenticating to your IDP, the attributes relating to the user will be available in the attribute mapping section either by:
&nbsp;&nbsp;1. copying those attributes in any field: {{ .sAMAccountName }} {{ .cn }} {{ .userPrincipalName }} {{ .mail }}, ...
&nbsp;&nbsp;2. create custom rules based on some attributes like this: {{ if contains .memberOf "cn=admins" }}adminuser{{ else }}regularuser{{ end }} or {{ if eq .userPrincipalName "root" }}adminuser{{ else }}regularuser{{ end }}

[Purchase the enterprise edition](https://www.filestash.app/purchase-enterprise-selfhosted.html)`,
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

func (this Ldap) Callback(idpParams map[string]string, req *http.Request, res http.ResponseWriter) (map[string]string, error) {
	return nil, ErrNotImplemented
}
