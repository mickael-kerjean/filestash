package session

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/cookie"
	"github.com/mickael-kerjean/filestash/server/pkg/files"
	"github.com/mickael-kerjean/filestash/server/pkg/journal"
	"github.com/mickael-kerjean/filestash/server/pkg/token"
)

func SessionAuthMiddleware(ctx *App, res http.ResponseWriter, req *http.Request) {
	op := journal.PublishSession(ctx, req, "middleware")
	defer op.Close(res)
	SSOCookieName := "ssoref"

	// Step0: Initialisation
	_get := req.URL.Query()
	plugin := func() IAuthentication {
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
	for key, element := range _get {
		if len(element) == 0 {
			continue
		}
		formData[key] = element[0]
	}
	if req.Method == http.MethodPost {
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

	idpParams := TmplParams(map[string]string{})
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
	for k, v := range idpParams {
		out, err := TmplExec(NewStringFromInterface(v), idpParams)
		if err != nil {
			http.Redirect(
				res, req,
				"/?error=Not%20Valid&trace=idp - "+err.Error(),
				http.StatusTemporaryRedirect,
			)
			return
		}
		idpParams[k] = out
	}

	// Step1: Entrypoint of the authentication process is handled by the plugin
	if req.Method == "GET" && _get.Get("action") == "redirect" {
		if label := _get.Get("label"); label != "" {
			http.SetCookie(res, cookie.Create(
				&http.Cookie{
					Name:   SSOCookieName,
					Value:  label + "::" + _get.Get("state"),
					MaxAge: 60 * 10,
					Path:   COOKIE_PATH,
				},
				cookie.WithRules(req),
				cookie.WithSameSite(http.SameSiteDefaultMode),
			))
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
	pluginCallback, err := plugin.Callback(formData, idpParams, res)
	if err == ErrAuthenticationFailed {
		Log.Warning("failed authentication - %s", err.Error())
		http.Redirect(
			res, req,
			req.URL.Path+"?action=redirect",
			http.StatusSeeOther,
		)
		return
	} else if err != nil && strings.HasPrefix(res.Header().Get("Content-Type"), "text/html") == false {
		Log.Error("session::authMiddleware 'callback error - %s'", err.Error())
		http.Redirect(
			res, req,
			"/?error="+ErrNotAllowed.Error()+"&trace=redirect request failed - "+err.Error(),
			http.StatusSeeOther,
		)
		return
	} else if err != nil { // response handled directly within a plugin
		return
	}
	templateBind := TmplParams(pluginCallback)

	var (
		label = ""
		state = ""
	)
	if refCookie, err := req.Cookie(SSOCookieName); err == nil { // TODO: deprecate SSOCookieName
		s := strings.SplitN(refCookie.Value, "::", 2)
		switch len(s) {
		case 1:
			label = s[0]
		case 2:
			label = s[0]
			state = s[1]
		}
	} else if l := req.URL.Query().Get("label"); l != "" {
		label = l
		state = req.URL.Query().Get("state")
	} else {
		Log.Warning("session::authMiddleware action=callback_error err=missing_label url=%s", req.URL.String())
	}
	if decodedState, err := base64.StdEncoding.DecodeString(state); err == nil {
		stateStruct := map[string]string{}
		json.Unmarshal(decodedState, &stateStruct)

		// check variables are "legit"
		attributes := ""
		signature := ""
		fields := strings.Split(Config.Get("features.protection.signature").String(), ",")
		for k, v := range stateStruct {
			if k == "signature" {
				signature = v
			}
			if slices.Contains(fields, k) {
				attributes += fmt.Sprintf("%s[%s] ", k, v)
			}
		}
		if attributes = strings.TrimSpace(attributes); attributes != "" {
			v, err := DecryptString(SECRET_KEY_DERIVATE_FOR_SIGNATURE, signature)
			if err != nil || attributes != v {
				v, _ = EncryptString(SECRET_KEY_DERIVATE_FOR_SIGNATURE, attributes)
				Log.Debug("callback signature is required, signature=%s", v)
				http.Redirect(
					res, req,
					WithBase("/?error=Invalid%20Signature&trace=signature is not correct"),
					http.StatusTemporaryRedirect,
				)
				return
			}
		}

		// populate variable
		for key, value := range stateStruct {
			if templateBind[key] != "" {
				continue
			}
			templateBind[key] = value
		}
	}
	redirectURI := templateBind["next"]
	if redirectURI == "" {
		redirectURI = WithBase("/")
	}
	if templateBind["nav"] != "" {
		redirectURI += "?nav=" + templateBind["nav"]
	}

	// Step3: create a backend connection object
	session, err := func(tb map[string]string) (map[string]string, error) {
		globalMapping := map[string]map[string]interface{}{}
		if err = json.Unmarshal(
			[]byte(Config.Get("middleware.attribute_mapping.params").String()),
			&globalMapping,
		); err != nil {
			Log.Warning("session::authMiddlware 'attribute mapping error' %s", err.Error())
			return map[string]string{}, err
		}
		mappingToUse := map[string]string{}
		for k, v := range globalMapping[label] {
			out, err := TmplExec(NewStringFromInterface(v), tb)
			if err != nil {
				Log.Debug("session::authMiddleware action=tmplExec err=%s", err.Error())
			}
			mappingToUse[k] = out
		}
		mappingToUse["timestamp"] = time.Now().Format(time.RFC3339)
		if label != "" && Config.Get("general.extended_session").Bool() {
			pluginCallback["label"] = label
			if jsonStr, err := json.Marshal(pluginCallback); err == nil {
				mappingToUse["session"] = string(jsonStr)
			}
		}
		return mappingToUse, nil
	}(templateBind)
	if err != nil {
		Log.Debug("session::authMiddleware 'auth mapping failed %s'", err.Error())
		http.Redirect(
			res, req,
			WithBase("/?error=Not%20Valid&trace=mapping_error - "+err.Error()),
			http.StatusTemporaryRedirect,
		)
		return
	}

	if _, err := files.NewBackend(ctx, session); err != nil {
		Log.Debug("session::authMiddleware 'backend connection failed %s'", err.Error())
		Log.Info("[auth] status=failed user=%s backend=%s::%s ip=%s err=%s", username(session), session["type"], backendID(session), ip(req), ferror(err))
		url := "/?error=" + ErrNotValid.Error() + "&trace=backend error - " + err.Error()
		if IsATranslatedError(err) {
			url = "/?error=" + err.Error() + "&trace=backend error - " + err.Error()
		}
		http.Redirect(res, req, WithBase(url), http.StatusTemporaryRedirect)
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
	token.Inject(res, req, obfuscate)
	http.SetCookie(res, cookie.Create(&http.Cookie{
		Name:   SSOCookieName,
		Value:  "",
		MaxAge: -1,
		Path:   COOKIE_PATH,
	}, cookie.WithRules(req)))
	if Config.Get("features.protection.iframe").String() != "" {
		redirectURI += "#bearer=" + obfuscate
	}
	Log.Info("[auth] status=success user=%s backend=%s::%s ip=%s", username(session), session["type"], backendID(session), ip(req))
	http.Redirect(res, req, redirectURI, http.StatusSeeOther)
}
