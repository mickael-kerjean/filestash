package plg_authenticate_openid

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/tidwall/gjson"
	"golang.org/x/net/context"
	"golang.org/x/oauth2"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func randString(nByte int) (string, error) {
	b := make([]byte, nByte)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

type OIDC struct {
}

func init() {
	Hooks.Register.AuthenticationMiddleware("oidc", OIDC{})
}

func (o OIDC) Setup() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "oidc",
			},
			{
				Name:        "OpenID URL",
				Required:    true,
				Type:        "text",
				Value:       "",
				Placeholder: "<OpenID URL>",
			},
			{
				Name:        "Client ID",
				Required:    true,
				Type:        "text",
				Value:       "",
				Placeholder: "<OpenID Client ID>",
			},
			{
				Name:        "Client Secret",
				Required:    true,
				Type:        "text",
				Value:       "",
				Placeholder: "<OpenID Client Secret>",
			},
			{
				Name:        "Scopes",
				Required:    true,
				Type:        "text",
				Value:       "profile email",
				Placeholder: "<Additional scopes to request>",
			},
			{
				Name:        "Extra claims",
				Type:        "text",
				Value:       "",
				Placeholder: "<Custom claim expressions separated by spaces. Ex. verified_email=true>",
			},
		},
	}
}

type OIDC_CustomClaim struct {
	path  string
	value string
}

type OIDC_Params struct {
	url          string
	clientId     string
	clientSecret string
	scopes       []string
	claims       []OIDC_CustomClaim
}

func GetParams(idpParams map[string]string) OIDC_Params {
	var params OIDC_Params

	params.url = idpParams["OpenID_URL"]
	params.clientId = idpParams["Client_ID"]
	params.clientSecret = idpParams["Client_Secret"]
	params.scopes = append([]string{oidc.ScopeOpenID}, strings.Fields(idpParams["Scopes"])...)
	params.claims = []OIDC_CustomClaim{}

	for _, expr := range strings.Fields(idpParams["Extra_claims"]) {
		kv := strings.Split(expr, "=")
		if len(kv) == 2 {
			params.claims = append(params.claims, OIDC_CustomClaim{
				path:  kv[0],
				value: kv[1],
			})
		}
	}

	return params
}

func GetRedirectURL(req *http.Request) string {

	var https = strings.ToLower(req.Header.Get("X-Forwarded-Proto")) == "https" ||
		strings.ToLower(req.Header.Get("X-Forwarded-Scheme")) == "https" ||
		req.TLS != nil
	var scheme = "http"
	if https {
		scheme = "https"
	}

	var redirectUrl = url.URL{
		Scheme: scheme,
		Host:   req.Host,
		Path:   "/api/session/auth/",
	}
	return redirectUrl.String()
}

type OIDC_State struct {
	Nonce string `json:"n"`
	Url   string `json:"u"`
}

func EncodeState(nonce string, url string) (*string, error) {
	var oidc_state OIDC_State = OIDC_State{
		Nonce: nonce,
		Url:   url,
	}

	var value, err = json.Marshal(oidc_state)
	if err != nil {
		return nil, err
	}

	var state = base64.RawURLEncoding.EncodeToString(value)
	return &state, nil
}

func DecodeState(state string) (*OIDC_State, error) {
	var value, err = base64.RawURLEncoding.DecodeString(state)
	if err != nil {
		return nil, err
	}

	var oidc_state OIDC_State
	err = json.Unmarshal([]byte(value), &oidc_state)
	if err != nil {
		return nil, err
	}
	return &oidc_state, nil
}

func (o OIDC) EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error {
	ctx := context.Background()

	params := GetParams(idpParams)
	redirectURL := GetRedirectURL(req)

	provider, err := oidc.NewProvider(ctx, params.url)
	if err != nil {
		http.Error(res, "Internal error", http.StatusInternalServerError)
		Log.Error(err.Error())
		return nil
	}
	config := oauth2.Config{
		ClientID:     params.clientId,
		ClientSecret: params.clientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  redirectURL,
		Scopes:       params.scopes,
	}

	nonce, err := randString(16)
	if err != nil {
		http.Error(res, "Internal error", http.StatusInternalServerError)
		Log.Error(err.Error())
		return nil
	}

	var state *string
	state, err = EncodeState(nonce, redirectURL)
	if err != nil {
		http.Error(res, "Internal error", http.StatusInternalServerError)
		Log.Error(err.Error())
		return nil
	}

	http.Redirect(res, req, config.AuthCodeURL(*state, oidc.Nonce(nonce)), http.StatusFound)
	return nil
}

func (o OIDC) Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error) {

	ctx := context.Background()
	params := GetParams(idpParams)

	var oidc_state *OIDC_State
	oidc_state, err := DecodeState(formData["state"])
	if err != nil {
		Log.Error("OIDC: No state from redirect URL: '%s', (provider=%s, client=%s, state=%s)",
			err.Error(), params.url, params.clientId, formData["state"])
		return nil, ErrNotAuthorized
	}

	provider, err := oidc.NewProvider(ctx, params.url)
	if err != nil {
		Log.Error(err.Error())
		return nil, ErrNotAuthorized
	}
	config := oauth2.Config{
		ClientID:     params.clientId,
		ClientSecret: params.clientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  oidc_state.Url,
		Scopes:       params.scopes,
	}

	oauth2Token, err := config.Exchange(ctx, formData["code"])
	if err != nil {
		Log.Error("OIDC: Failed to exchange token: '%s', (provider=%s, client=%s)",
			err.Error(), params.url, params.clientId, params.clientId)
		return nil, ErrNotAuthorized
	}

	rawIDToken := oauth2Token.Extra("id_token").(string)
	Log.Debug("OIDC: provider=%s, client=%s, IDToken=%s",
		params.url, params.clientId, rawIDToken)

	var verifier = provider.Verifier(&oidc.Config{ClientID: params.clientId})
	idToken, err := verifier.Verify(ctx, rawIDToken)
	if err != nil {
		Log.Error("OIDC: Failed to verify ID token: '%s', (provider=%s, client=%s)",
			err.Error(), params.url, params.clientId)
		return nil, ErrNotAuthorized
	}

	if idToken.Nonce != oidc_state.Nonce {
		Log.Error("OIDC: Nonce did not match value in ID token: %s != %s, (provider=%s, client=%s)",
			idToken.Nonce, oidc_state.Nonce, params.url, params.clientId)
		return nil, ErrNotAuthorized
	}

	// Unmarshal all properties of the ID token
	claims := make(map[string]interface{})
	err = idToken.Claims(&claims)
	if err != nil {
		Log.Debug("OIDC: Failed to unmarshal id token: '%s'", err)
		return nil, ErrNotAuthorized
	}

	// Validate custom claims
	var payload, _ = json.Marshal(claims)
	for _, claim := range params.claims {
		result := gjson.Get(string(payload), claim.path)
		// Node is not of a literal type, try to deserialize as array.
		if result.Type == gjson.JSON {
			var values []string
			json.Unmarshal([]byte(result.Raw), &values)

			var found bool = false
			for _, value := range values {
				if claim.value == value {
					found = true
					break
				}
			}
			if !found {
				Log.Error("OIDC: Claim request not satisfied : '%s != %s (was %s) ', (provider=%s, client=%s)",
					claim.path, claim.value, result.Raw, params.url, params.clientId)
				return nil, ErrNotAuthorized
			}
		} else {
			var value string
			if result.Type == gjson.String {
				value = result.Str
			} else if result.Type == gjson.Number {
				value = fmt.Sprintf("%f", result.Num)
			} else if result.Type == gjson.True {
				value = "true"
			} else if result.Type == gjson.False {
				value = "false"
			}

			if claim.value != value {
				Log.Error("OIDC: Claim request not satisfied : '%s != %s (was %s) ', (provider=%s, client=%s)",
					claim.path, claim.value, result.Str, params.url, params.clientId)
				return nil, ErrNotAuthorized
			}
		}
	}

	return map[string]string{
		"username":           fmt.Sprint(claims["preferred_username"]),
		"preferred_username": fmt.Sprint(claims["preferred_username"]),
		"email":              fmt.Sprint(claims["email"]),
		"locale":             fmt.Sprint(claims["locale"]),
	}, nil
}
