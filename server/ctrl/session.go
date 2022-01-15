package ctrl

import (
	"encoding/json"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/middleware"
	"github.com/mickael-kerjean/filestash/server/model"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Session struct {
	Home   *string `json:"home,omitempty"`
	IsAuth bool    `json:"is_authenticated"`
}

func SessionGet(ctx App, res http.ResponseWriter, req *http.Request) {
	r := Session{
		IsAuth: false,
	}
	if ctx.Backend == nil {
		SendSuccessResult(res, r)
		return
	}
	home, err := model.GetHome(ctx.Backend, ctx.Session["path"])
	if err != nil {
		SendSuccessResult(res, r)
		return
	}
	r.IsAuth = true
	r.Home = NewString(home)
	SendSuccessResult(res, r)
}

func SessionAuthenticate(ctx App, res http.ResponseWriter, req *http.Request) {
	ctx.Body["timestamp"] = time.Now().String()
	session := model.MapStringInterfaceToMapStringString(ctx.Body)
	session["path"] = EnforceDirectory(session["path"])

	backend, err := model.NewBackend(&ctx, session)
	if err != nil {
		Log.Debug("session::auth 'NewBackend' %+v", err)
		SendErrorResult(res, err)
		return
	}

	if obj, ok := backend.(interface {
		OAuthToken(*map[string]interface{}) error
	}); ok {
		err := obj.OAuthToken(&ctx.Body)
		if err != nil {
			Log.Debug("session::auth 'OAuthToken' %+v", err)
			SendErrorResult(res, NewError("Can't authenticate (OAuth error)", 401))
			return
		}
		session = model.MapStringInterfaceToMapStringString(ctx.Body)
		backend, err = model.NewBackend(&ctx, session)
		if err != nil {
			Log.Debug("session::auth 'OAuthToken::NewBackend' %+v", err)
			SendErrorResult(res, NewError("Can't authenticate", 401))
			return
		}
	}

	home, err := model.GetHome(backend, session["path"])
	if err != nil {
		Log.Debug("session::auth 'GetHome' %+v", err)
		SendErrorResult(res, ErrAuthenticationFailed)
		return
	}

	s, err := json.Marshal(session)
	if err != nil {
		Log.Debug("session::auth 'Marshal' %+v", err)
		SendErrorResult(res, NewError(err.Error(), 500))
		return
	}
	obfuscate, err := EncryptString(SECRET_KEY_DERIVATE_FOR_USER, string(s))
	if err != nil {
		Log.Debug("session::auth 'Encryption' %+v", err)
		SendErrorResult(res, NewError(err.Error(), 500))
		return
	}
	http.SetCookie(res, &http.Cookie{
		Name:     COOKIE_NAME_AUTH,
		Value:    obfuscate,
		MaxAge:   60 * Config.Get("general.cookie_timeout").Int(),
		Path:     COOKIE_PATH,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})

	if home != "" {
		SendSuccessResult(res, home)
		return
	}
	SendSuccessResult(res, nil)
}

func SessionLogout(ctx App, res http.ResponseWriter, req *http.Request) {
	go func() {
		// user typically expect the logout to feel instant but in our case we still need to make sure
		// the connection is closed as lot of backend requires to hold an active session which we cache.
		// Whenever somebody logout after say 30 minutes idle, the logout would first create a connection
		// then close which can take a few seconds and make for a bad user experience.
		// By pushing that connection close in a goroutine, we make sure the logout is much faster for
		// the user while still retaining that functionality.
		SessionTry(func(c App, _res http.ResponseWriter, _req *http.Request) {
			if c.Backend != nil {
				if obj, ok := c.Backend.(interface{ Close() error }); ok {
					obj.Close()
				}
			}
		})(ctx, res, req)
	}()
	http.SetCookie(res, &http.Cookie{
		Name:   COOKIE_NAME_AUTH,
		Value:  "",
		MaxAge: -1,
		Path:   COOKIE_PATH,
	})
	http.SetCookie(res, &http.Cookie{
		Name:   COOKIE_NAME_ADMIN,
		Value:  "",
		MaxAge: -1,
		Path:   COOKIE_PATH_ADMIN,
	})
	http.SetCookie(res, &http.Cookie{
		Name:   COOKIE_NAME_PROOF,
		Value:  "",
		MaxAge: -1,
		Path:   COOKIE_PATH,
	})
	SendSuccessResult(res, nil)
}

func SessionOAuthBackend(ctx App, res http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	a := map[string]string{
		"type": vars["service"],
	}
	b, err := model.NewBackend(&ctx, a)
	if err != nil {
		Log.Debug("session::oauth 'NewBackend' %+v", err)
		SendErrorResult(res, err)
		return
	}
	obj, ok := b.(interface{ OAuthURL() string })
	if ok == false {
		Log.Debug("session::oauth 'Backend does not support oauth - \"%s\"'", a["type"])
		SendErrorResult(res, ErrNotSupported)
		return
	}
	redirectUrl, err := url.Parse(obj.OAuthURL())
	if err != nil {
		Log.Debug("session::oauth 'Parse URL - \"%s\"'", a["type"])
		SendErrorResult(res, ErrNotValid)
		return
	}
	stateValue := vars["service"]
	if req.URL.Query().Get("next") != "" {
		stateValue += "::" + req.URL.Query().Get("next")
	}
	q := redirectUrl.Query()
	q.Set("state", stateValue)
	redirectUrl.RawQuery = q.Encode()
	if strings.Contains(req.Header.Get("Accept"), "text/html") {
		http.Redirect(res, req, redirectUrl.String(), http.StatusSeeOther)
		return
	}
	SendSuccessResult(res, redirectUrl.String())
}

func SessionAuthMiddleware(ctx App, res http.ResponseWriter, req *http.Request) {
	SSOCookieName := "ssoref"

	// Step0: Initialisation
	_get := req.URL.Query()
	plugin := func() IAuth {
		selectedPluginId := Config.Get("middleware.identity_provider.type").String()
		if selectedPluginId == "" {
			return nil
		}
		for key, plugin := range Hooks.Get.AuthenticationMiddleware() {
			if key == selectedPluginId {
				return plugin
			}
		}
		return nil
	}()
	if plugin == nil {
		http.Redirect(
			res, req,
			"/?error=Not%20Found&trace=middleware not found",
			http.StatusTemporaryRedirect,
		)
		return
	}
	formData := map[string]string{}
	switch req.Method {
	case "GET":
		for key, element := range _get {
			if len(element) == 0 {
				continue
			}
			formData[key] = element[0]
		}
	case "POST":
		if err := req.ParseForm(); err != nil {
			http.Redirect(
				res, req,
				"/?error=Not%20Valid&trace=parsing body - "+err.Error(),
				http.StatusTemporaryRedirect,
			)
			return
		}
		for key, values := range req.Form {
			if len(values) == 0 {
				continue
			}
			formData[key] = values[0]
		}
	}
	idpParams := map[string]string{}
	if err := json.Unmarshal(
		[]byte(Config.Get("middleware.identity_provider.params").String()),
		&idpParams,
	); err != nil {
		http.Redirect(
			res, req,
			"/?error=Not%20Valid&trace=unpacking idp - "+err.Error(),
			http.StatusTemporaryRedirect,
		)
		return
	}

	// Step1: Entrypoint of the authentication process is handled by the plugin
	if req.Method == "GET" && _get.Get("action") == "redirect" {
		if label := _get.Get("label"); label != "" {
			http.SetCookie(res, &http.Cookie{
				Name:     SSOCookieName,
				Value:    label,
				MaxAge:   60 * 10,
				Path:     COOKIE_PATH,
				HttpOnly: true,
				SameSite: http.SameSiteStrictMode,
			})
		}
		if err := plugin.EntryPoint(idpParams, req, res); err != nil {
			Log.Error("entrypoint - %s", err.Error())
			res.Header().Set("Content-Type", "text/html; charset=utf-8")
			res.WriteHeader(http.StatusOK)
			res.Write([]byte(Page(err.Error())))
		}
		return
	}

	// Step2: End of the authentication process. Could come from:
	// - target of a html form. eg: ldap, mysql, ...
	// - identity provider redirection uri. eg: oauth2, openid, ...
	templateBind, err := plugin.Callback(formData, idpParams, res)
	if err != nil {
		Log.Error("session::authMiddleware 'callback error - %s'", err.Error())
		http.Redirect(res, req, req.URL.Path+"?action=redirect", http.StatusSeeOther)
		return
	}

	// Step3: create a backend connection object
	session, err := func(tb map[string]string) (map[string]string, error) {
		refCookie, err := req.Cookie(SSOCookieName)
		if err != nil {
			return map[string]string{}, err
		}
		globalMapping := map[string]map[string]interface{}{}
		if err = json.Unmarshal(
			[]byte(Config.Get("middleware.attribute_mapping.params").String()),
			&globalMapping,
		); err != nil {
			return map[string]string{}, err
		}
		mappingToUse := map[string]string{}
		for k, v := range globalMapping[refCookie.Value] {
			mappingToUse[k] = NewStringFromInterface(v)
		}
		mappingToUse["timestamp"] = time.Now().String()
		return mappingToUse, nil
	}(templateBind)
	if err != nil {
		Log.Debug("session::authMiddleware 'auth mapping failed %s'", err.Error())
		http.Redirect(
			res, req,
			"/?error=Not%20Valid&trace=mapping_error - "+err.Error(),
			http.StatusTemporaryRedirect,
		)
		return
	}
	if _, err := model.NewBackend(&ctx, session); err != nil {
		Log.Debug("session::authMiddleware 'backend connection failed %+v - %s'", session, err.Error())
		http.Redirect(
			res, req,
			"/?error=Not%20Valid&trace=backend error - "+err.Error(),
			http.StatusTemporaryRedirect,
		)
		return
	}

	// Step4: persist connection with a cookie
	s, err := json.Marshal(session)
	if err != nil {
		Log.Debug("session::authMiddleware 'session marshal error %+v'", session)
		SendErrorResult(res, ErrNotValid)
		return
	}
	obfuscate, err := EncryptString(SECRET_KEY_DERIVATE_FOR_USER, string(s))
	if err != nil {
		Log.Debug("session::authMiddleware 'encryption error - %s", err.Error())
		SendErrorResult(res, ErrNotValid)
		return
	}
	http.SetCookie(res, &http.Cookie{
		Name:     COOKIE_NAME_AUTH,
		Value:    obfuscate,
		MaxAge:   60 * Config.Get("general.cookie_timeout").Int(),
		Path:     COOKIE_PATH,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
	http.SetCookie(res, &http.Cookie{
		Name:     SSOCookieName,
		Value:    "",
		MaxAge:   -1,
		Path:     COOKIE_PATH,
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
	http.Redirect(res, req, "/", http.StatusTemporaryRedirect)
}
