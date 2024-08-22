package plg_authenticate_htpasswd

import (
	"crypto/sha1"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/mickael-kerjean/filestash/server/plugin/plg_authenticate_htpasswd/deps/crypt"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_authenticate_htpasswd/deps/crypt/apr1_crypt"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_authenticate_htpasswd/deps/crypt/md5_crypt"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_authenticate_htpasswd/deps/crypt/sha256_crypt"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_authenticate_htpasswd/deps/crypt/sha512_crypt"
	"net/http"
	"strings"
)

func init() {
	Hooks.Register.AuthenticationMiddleware("htpasswd", Htpasswd{})
}

type Htpasswd struct{}

func (this Htpasswd) Setup() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "htpasswd",
			},
			{
				Name: "users",
				Type: "long_text",
				Placeholder: `test1:$apr1$ZiAIyyhS$ovyMo9eJRgDF/luvmAigP0
test2:{SHA}EJ9LPFDXsN9ynSmbxvjp75Bmlx8=
test3:$6$ME6DxvSEUjW4Kx/j$vQ5Yh1utmNEr4EZnWH0ZQa6hrG5yu2siybFW10aAax4u611W9awI5V90YWqGs4NjTSHkCrhpdbJoNErW9/Pbh1:19306:0:99999:7:::
test4:$6$wTy86P73X/DsCiQy$El3JVUjepBUO.e.1OTuDt4yL9w2CnzY4jHaIbg1P7p508n8vjzCC8ZNsWa1IlbhciBM8.0LqqXWi3OuhGfPmP.
test5:$5$RkdUxGLHGhmrO0yj$K6bCqmB.OPR7KM4i5eiAG.mxFyhElLNdthSL.dreqN5
test6:$1$vuUKD.37$R6eCPFBa6lKIVfnkABveB1`,
				Default: "",
				Description: `The list of users who are granted access using either or both the htpasswd file format or the /etc/shadow file format. To generate a password:
'openssl passwd -6' or 'mkpasswd -m SHA-512' or the htpasswd cli tool.

This plugin exposes {{ .user }} and {{ .password }} for the attribute mapping section`,
			},
		},
	}
}

func (this Htpasswd) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
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
		return fmt.Sprintf(`<p class="flash">%s</p>`, c.Value)
	}
	res.Header().Set("Content-Type", "text/html; charset=utf-8")
	res.WriteHeader(http.StatusOK)
	res.Write([]byte(Page(`
      <form action="` + WithBaseUrl("/api/session/auth/") + `" method="post" class="component_middleware">
        <label>
          <input type="text" name="user" value="" placeholder="User" />
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

func (this Htpasswd) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {
	if idpParams["users"] == "" {
		Log.Error("plg_authenticate_htpasswd::callback there is no user configured")
		return nil, NewError("You haven't configured any users", 500)
	}
	lines := strings.Split(idpParams["users"], "\n")
	for n, line := range lines {
		pair := strings.SplitN(line, ":", 2)
		if len(pair) != 2 {
			continue
		} else if formData["user"] != pair[0] {
			continue
		} else if verifyPassword(
			formData["password"],
			strings.SplitN(pair[1], ":", 2)[0], // filter out unwanted fields from hash
			formData["user"],
		) == false {
			continue
		}
		return map[string]string{
			"user":     formData["user"],
			"password": formData["password"],
			"n":        fmt.Sprintf("%d", n),
		}, nil
	}
	http.SetCookie(res, &http.Cookie{
		Name:   "flash",
		Value:  "Invalid username or password",
		MaxAge: 1,
		Path:   "/",
	})
	return nil, ErrAuthenticationFailed
}

func verifyPassword(password string, hash string, _user string) bool {
	if password == hash {
		Log.Warning("plg_authenticate_htpasswd password for user '%s' isn't stored in a secure way, you should hash your password using something like 'openssl passwd -6'", _user)
		return true
	} else if strings.HasPrefix(hash, "{SHA}") {
		d := sha1.New()
		d.Write([]byte(password))
		return subtle.ConstantTimeCompare(
			[]byte(strings.TrimPrefix(hash, "{SHA}")),
			[]byte(base64.StdEncoding.EncodeToString(d.Sum(nil))),
		) == 1
	}
	var c crypt.Crypter
	parts := strings.SplitN(hash, "$", 4)
	if len(parts) != 4 {
		return false
	}
	if strings.HasPrefix(hash, "$apr1$") {
		c = apr1_crypt.New()
		parts[2] = "$apr1$" + parts[2]
	} else if strings.HasPrefix(hash, "$6$") {
		c = sha512_crypt.New()
		parts[2] = "$6$" + parts[2]
	} else if strings.HasPrefix(hash, "$5$") {
		c = sha256_crypt.New()
		parts[2] = "$5$" + parts[2]
	} else if strings.HasPrefix(hash, "$1$") {
		c = md5_crypt.New()
		parts[2] = "$1$" + parts[2]
	} else {
		// TODO: there are other algorithm available but that's another job
		// for another day
		return false
	}
	shadow, err := c.Generate(
		[]byte(password),
		[]byte(parts[2]),
	)
	if err != nil {
		return false
	} else if shadow != hash {
		return false
	}
	return true
}
