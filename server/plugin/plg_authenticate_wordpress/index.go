package plg_authenticate_wordpress

import (
	"io"
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/ctrl"
)

func init() {
	Hooks.Register.AuthenticationMiddleware("wordpress", Wordpress{})
}

type Wordpress struct{}

func (this Wordpress) Setup() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name: "banner",
				Type: "hidden",
				Description: `Make it possible for your Wordpress users to authenticate to your storage.
If valid, you will have the following attributes available about the user in the attribute mapping section:
{{ .user }}, {{ .email }}, {{ .roles }}, {{ .id }}, and {{ .password }}`,
			},
			{
				Name:  "type",
				Type:  "hidden",
				Value: "wordpress",
			},
			{
				Name:        "url",
				Type:        "text",
				Description: `The URL of your wordpress instance. Eg: http://localhost`,
			},
		},
	}
}

func (this Wordpress) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	res.Header().Set("Content-Type", "text/html; charset=utf-8")
	res.WriteHeader(http.StatusOK)
	res.Write([]byte(Page(`
      <form method="post" class="component_middleware">
        <label>
          <input type="text" name="user" value="" placeholder="User" autocorrect="off" autocapitalize="off" />
        </label>
        <label>
          <input type="password" name="password" value="" placeholder="Password" />
        </label>
        <button>CONNECT</button>
        <style>
          form { padding-top: 10vh; }
        </style>
      </form>`)))
	return nil
}

func (this Wordpress) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	username := formData["user"]
	password := formData["password"]
	wpURL := strings.TrimRight(idpParams["url"], "/")
	if username == "" || password == "" || wpURL == "" {
		return nil, ErrAuthenticationFailed
	}
	xmlBody, err := TmplExec(
		`<?xml version="1.0"?>
         <methodCall>
             <methodName>wp.getProfile</methodName>
             <params>
                 <param><value><string>1</string></value></param>
                 <param><value><string>{{ .user }}</string></value></param>
                 <param><value><string>{{ .password }}</string></value></param>
             </params>
         </methodCall>`,
		map[string]string{
			"user":     username,
			"password": password,
		},
	)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", wpURL+"/xmlrpc.php", strings.NewReader(xmlBody))
	if err != nil {
		return nil, NewError("Failed to create request: "+err.Error(), 500)
	}
	req.Header.Set("Content-Type", "text/xml")
	resp, err := HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	bodyS := string(body)
	if strings.Contains(bodyS, "<fault>") {
		return nil, ErrAuthenticationFailed
	}
	user := extractXMLValue(bodyS, "username")
	if user == "" {
		return nil, ErrAuthenticationFailed
	}
	out := map[string]string{
		"user":     user,
		"password": password,
	}
	if email := extractXMLValue(bodyS, "email"); email != "" {
		out["email"] = email
	}
	if userID := extractXMLValue(bodyS, "user_id"); userID != "" {
		out["id"] = userID
	}
	out["role"] = strings.Join(extractXMLArray(bodyS, "roles"), ", ")
	return out, nil
}
