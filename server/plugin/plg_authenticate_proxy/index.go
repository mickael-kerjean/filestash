package plg_authenticate_proxy

import (
        "html"
        "net/http"

        . "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
        Hooks.Register.AuthenticationMiddleware("proxy", Proxy{})
}

type Proxy struct{}

func (this Proxy) Setup() Form {
        return Form{
                Elmnts: []FormElement{
                        {
                                Name:  "type",
                                Type:  "hidden",
                                Value: "Proxy",
                        },
                        {
                                Name:        "user_header",
                                Type:        "text",
                                Value:       "X-Auth-Request-Preferred-Username",
                                Placeholder: "Header containing the user",
                                Description: "Proxy user header. Available as a variable with {{ .user }}",
                        },
                },
        }
}

func (this Proxy) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
        res.Header().Set("Content-Type", "text/html; charset=utf-8")
        getParams := "?label=" + html.EscapeString(req.URL.Query().Get("label")) + "&state=" + html.EscapeString(req.URL.Query().Get("state"))
        userHeader := html.EscapeString(req.Header.Get(idpParams["user_header"]))
        res.WriteHeader(http.StatusOK)
        res.Write([]byte(Page(`
                <form action="` + WithBase("/api/session/auth/"+getParams) + `" method="post">
                        <label>
                                <input type="text" name="user" value="` + userHeader + `" placeholder="User" />
                        </label>
                </form>
                <script>document.querySelector("form").submit();</script>
        `)))
        return nil
}

func (this Proxy) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
		if formData["user"] == "" {
			Log.Error("plg_authenticate_proxy::callback there is no user set")
			return nil, ErrAuthenticationFailed
		}
        return map[string]string{
                "user":     formData["user"],
        }, nil
}