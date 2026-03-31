package plg_handler_mcp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

const (
	DEFAULT_TOKEN_EXPIRY  = 3600
	DEFAULT_SECRET_EXPIRY = 30 * 24 * 3600
)

var KEY_FOR_CODE string

func init() {
	Hooks.Register.Onload(func() {
		KEY_FOR_CODE = Hash("MCP_CODE_"+SECRET_KEY, len(SECRET_KEY))
	})
}

func (this Server) WellKnownOAuthAuthorizationServerHandler(_ *App, w http.ResponseWriter, r *http.Request) {
	baseURL := this.baseURL(r)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"issuer":                   baseURL,
		"authorization_endpoint":   fmt.Sprintf("%s/mcp/authorize", baseURL),
		"token_endpoint":           fmt.Sprintf("%s/mcp/token", baseURL),
		"registration_endpoint":    fmt.Sprintf("%s/mcp/register", baseURL),
		"response_types_supported": []string{"code"},
		"grant_types_supported":    []string{"authorization_code"},
		"token_endpoint_auth_methods_supported": []string{
			"none",
		},
		"code_challenge_methods_supported": []string{
			"S256",
		},
	})
}

func (this Server) WellKnownOAuthProtectedResourceHandler(_ *App, w http.ResponseWriter, r *http.Request) {
	baseURL := this.baseURL(r)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"resource":                 baseURL,
		"authorization_servers":    []string{baseURL},
		"bearer_methods_supported": []string{"header"},
		"scopes_supported":         []string{"openid"},
	})
}

func (this Server) baseURL(r *http.Request) string {
	scheme := "https"
	host := r.Host
	if strings.HasPrefix(host, "localhost") || strings.HasPrefix(host, "127.0.0.1") {
		scheme = "http"
	}
	return fmt.Sprintf("%s://%s", scheme, host)
}

func (this Server) AuthorizeHandler(_ *App, w http.ResponseWriter, r *http.Request) {
	responseType := r.URL.Query().Get("response_type")
	clientID := r.URL.Query().Get("client_id")
	redirectURI := r.URL.Query().Get("redirect_uri")
	state := r.URL.Query().Get("state")

	if responseType != "code" {
		http.Error(w, "response_type must be 'code'", http.StatusBadRequest)
		return
	} else if clientID == "" {
		http.Error(w, "client_id is required", http.StatusBadRequest)
		return
	} else if redirectURI == "" {
		http.Error(w, "redirect_uri is required", http.StatusBadRequest)
		return
	}
	http.Redirect(w, r, fmt.Sprintf(
		"/login?next=/api/mcp?redirect_uri=%s%%26state=%s%%26client_id=%s",
		redirectURI, state, clientID,
	), http.StatusSeeOther)
}

func (this Server) TokenHandler(_ *App, w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if grantType := r.FormValue("grant_type"); grantType != "authorization_code" {
		http.Error(w, "Invalid Grant Type", http.StatusBadRequest)
		return
	}
	token, err := DecryptString(KEY_FOR_CODE, r.FormValue("code"))
	if err != nil {
		http.Error(w, "Invalid authorization code", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token": token,
		"token_type":   "Bearer",
	})
}

func (this Server) RegisterHandler(ctx *App, w http.ResponseWriter, r *http.Request) {
	clientName := regexp.MustCompile("[^a-zA-Z0-9\\-]+").ReplaceAllString(
		fmt.Sprintf("%s", ctx.Body["client_name"]),
		"",
	)
	clientID := clientName + "." + Hash(clientName+time.Now().String(), 8)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(struct {
		ClientID                string   `json:"client_id"`
		ClientSecret            string   `json:"client_secret"`
		ClientIDIssuedAt        int64    `json:"client_id_issued_at"`
		ClientSecretExpiresAt   int64    `json:"client_secret_expires_at"`
		ClientName              string   `json:"client_name"`
		RedirectURIs            []string `json:"redirect_uris"`
		GrantTypes              []string `json:"grant_types"`
		TokenEndpointAuthMethod string   `json:"token_endpoint_auth_method"`
	}{
		ClientID:                clientID,
		ClientSecret:            Hash(clientID, 32), // unused. eg: chatgpt act as public client
		ClientIDIssuedAt:        time.Now().Unix(),
		ClientSecretExpiresAt:   time.Now().Unix() + DEFAULT_SECRET_EXPIRY,
		ClientName:              clientName,
		RedirectURIs:            []string{},
		GrantTypes:              []string{"authorization_code"},
		TokenEndpointAuthMethod: "none",
	})
}

func (this Server) CallbackHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	uri := req.URL.Query().Get("redirect_uri")
	state := req.URL.Query().Get("state")
	if uri == "" {
		SendErrorResult(res, ErrNotValid)
		return
	}
	code, err := EncryptString(KEY_FOR_CODE, ctx.Authorization)
	if err != nil {
		SendErrorResult(res, ErrNotValid)
		return
	}
	uri += "?code=" + code
	if state != "" {
		uri += "&state=" + state
	}
	http.Redirect(res, req, uri, http.StatusSeeOther)
}
