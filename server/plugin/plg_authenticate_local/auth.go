package plg_authenticate_local

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"image/png"
	"net/http"
	"text/template"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

type SimpleAuth struct{}

func (this SimpleAuth) Setup() Form {
	nUsers := 0
	aUsers := 0
	if users, err := getUsers(); err == nil {
		nUsers = len(users)
		for i := range users {
			if users[i].Disabled == false {
				aUsers += 1
			}
		}
	}

	return Form{
		Elmnts: []FormElement{
			{
				Name: "banner",
				Type: "hidden",
				Description: fmt.Sprintf(`<pre>MANAGEMENT GUI: <a href="`+WithBase("/admin/simple-user-management")+`">/admin/simple-user-management</a>
STATS:
┌─────────────┐   ┌──────────────┐
│ TOTAL USERS │   │ ACTIVE USERS │
|    %.4d     │   |     %.4d     │
└─────────────┘   └──────────────┘
EMAIL SERVER: %t
</pre>`, nUsers, aUsers, isEmailSetup()),
			},
			{
				Name:  "type",
				Type:  "hidden",
				Value: "local",
			},
			{
				Name:    "mfa",
				Type:    "select",
				Default: "",
				Opts:    []string{"", "TOTP"},
			},
			{
				Name: "notification_subject",
				Type: "text",
			},
			{
				Name: "notification_body",
				Type: "long_text",
				Placeholder: `Hello,

Your account to Filestash was created by an administrator. You can access
it via http://demo.filestash.app.

Your password is: {{ .password }}
The roles assigned to you: {{ .role }}

Cheers!`,
			},
			{
				Name: "db",
				Type: "hidden",
			},
		},
	}
}

func (this SimpleAuth) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	getFlash := func() string {
		c, err := req.Cookie("flash")
		if err != nil {
			return ""
		}
		http.SetCookie(res, &http.Cookie{
			Name:   "flash",
			MaxAge: -1,
			Path:   "/",
		})
		return fmt.Sprintf(`<p class="flash">%s</p>`, html.EscapeString(c.Value))
	}
	res.Header().Set("Content-Type", "text/html; charset=utf-8")
	res.WriteHeader(http.StatusOK)
	if c, err := req.Cookie("mfa"); err == nil && c.Value != "" {
		user := withMFA(User{}, c.Value)
		key, err := totp.Generate(totp.GenerateOpts{
			Issuer:      Config.Get("general.name").String(),
			AccountName: user.Email,
		})
		if err != nil {
			return err
		}
		var buf bytes.Buffer
		img, err := key.Image(200, 200)
		if err != nil {
			return err
		}
		if err = png.Encode(&buf, img); err != nil {
			return err
		}
		template.Must(template.New("app").Parse(Page(`
            <form method="post" class="component_middleware">
                {{ if eq .User.MFA "" }}
                <style>
                    #init { padding: 20px 20px 10px 20px; text-align: center; background: rgba(0,0,0,0.1); border-radius: 10px; margin-top: -10vh; margin-bottom: 20px; }
                    #init input { background: transparent; margin-bottom: 0; text-align: center; }
                </style>
                <div id="init">
                   <img src="data:image/png;base64,{{ .QRCode }}" />
                   <input type="text" name="mfa" value="{{ .MFASecret }}" readonly />
                </div>
                {{ end }}
                <label>
                    <input type="text" name="code" placeholder="code" />
                </label>
                <input type="hidden" name="session" value="{{ .Session }}" />
                <button>SUBMIT</button>
                `+getFlash()+`
                <style>
                    form { padding-top: 10vh; }
                </style>
            </form>
        `))).Execute(res, struct {
			User      User
			Session   string
			MFASecret string
			QRCode    string
		}{
			User:      user,
			Session:   c.Value,
			MFASecret: key.Secret(),
			QRCode:    base64.StdEncoding.EncodeToString(buf.Bytes()),
		})
		return nil
	}
	res.Write([]byte(Page(`
        <form method="post" class="component_middleware">
            <label>
                <input type="text" name="user" value="" placeholder="Email" />
            </label>
            <label>
                <input type="password" name="password" value="" placeholder="Password" />
            </label>
            <button>CONNECT</button>
            ` + getFlash() + `
            <style>
                .flash{ color: #f26d6d; font-weight: bold; }
                form { padding-top: 10vh; }
            </style>
        </form>`)))
	return nil
}

func (this SimpleAuth) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	users, err := getUsers()
	if err != nil {
		return nil, err
	}
	requestedUser := withMFA(User{
		Email:    formData["user"],
		Password: formData["password"],
	}, formData["session"])
	requestedUser.Code = formData["code"]
	for i := range users {
		if users[i].Email != requestedUser.Email {
			continue
		}
		if err = bcrypt.CompareHashAndPassword([]byte(users[i].Password), []byte(requestedUser.Password)); err != nil {
			break
		}
		if users[i].Disabled == true {
			http.SetCookie(res, &http.Cookie{
				Name:   "flash",
				Value:  "Account is disabled",
				MaxAge: 1,
				Path:   "/",
			})
			Log.Warning("plg_authentication_simple::auth action=authenticate email=%s err=disabled", users[i].Email)
			return nil, ErrAuthenticationFailed
		}
		if idpParams["mfa"] == "TOTP" {
			shouldSaveMFAKey := false
			if users[i].MFA == "" {
				users[i].MFA = formData["mfa"]
				shouldSaveMFAKey = true
			}
			if totp.Validate(requestedUser.Code, users[i].MFA) == false {
				requestedUser.MFA = users[i].MFA
				http.SetCookie(res, &http.Cookie{
					Name:   "mfa",
					Value:  requestedUser.EncryptedString(),
					MaxAge: 1,
				})
				return nil, ErrAuthenticationFailed
			}
			if shouldSaveMFAKey {
				saveUsers(users)
			}
		}
		session := map[string]string{
			"user":     requestedUser.Email,
			"password": requestedUser.Password,
			"bcrypt":   users[i].Password,
			"role":     users[i].Role,
		}
		s := ""
		for k, v := range session {
			if k == "password" || k == "bcrypt" {
				v = "*****"
			}
			s += fmt.Sprintf("%s[%s] ", k, v)
		}
		Log.Debug("IDP Attributes => %s", s)
		return session, nil
	}

	http.SetCookie(res, &http.Cookie{
		Name:   "flash",
		Value:  "Invalid username or password",
		MaxAge: 1,
		Path:   "/",
	})
	return nil, ErrAuthenticationFailed
}

func withMFA(user User, session string) User {
	if session == "" {
		return user
	}
	data, err := DecryptString(SECRET_KEY_DERIVATE_FOR_USER, session)
	if err != nil {
		return User{}
	}
	var u User
	if err = json.Unmarshal([]byte(data), &u); err != nil {
		return User{}
	}
	user.Email = u.Email
	user.Password = u.Password
	return u
}

func (user User) EncryptedString() string {
	b, err := json.Marshal(user)
	if err != nil {
		return ""
	}
	d, err := EncryptString(SECRET_KEY_DERIVATE_FOR_USER, string(b))
	if err != nil {
		return ""
	}
	return d
}
