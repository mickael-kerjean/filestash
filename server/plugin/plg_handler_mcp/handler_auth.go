package plg_handler_mcp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/utils"
)

const (
	DEFAULT_TOKEN_EXPIRY = 3600
)

func (this Server) WellKnownInfoHandler(w http.ResponseWriter, r *http.Request) {
	WithCors(w)
	if r.Method != http.MethodGet && r.Method != http.MethodOptions {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	host := r.Host
	baseURL := fmt.Sprintf("%s://%s", scheme, host)
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

func (this Server) AuthorizeHandler(w http.ResponseWriter, r *http.Request) {
	WithCors(w)

	responseType := r.URL.Query().Get("response_type")
	clientID := r.URL.Query().Get("client_id")
	redirectURI := r.URL.Query().Get("redirect_uri")

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

	http.Redirect(w, r, fmt.Sprintf("/login?next=/api/mcp?redirect_uri=%s", redirectURI), http.StatusSeeOther)
}

func (this Server) TokenHandler(w http.ResponseWriter, r *http.Request) {
	WithCors(w)
	if r.Method != http.MethodPost && r.Method != http.MethodOptions {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if grantType := r.FormValue("grant_type"); grantType != "authorization_code" {
		http.Error(w, "Invalid Grant Type", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token": r.FormValue("code"),
		"token_type":   "Bearer",
	})
}

func (this Server) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	WithCors(w)
	if r.Method != http.MethodPost && r.Method != http.MethodOptions {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"client_id":                  "anonymous",
		"client_secret":              "anonymous",
		"client_id_issued_at":        time.Now().Unix(),
		"client_secret_expires_at":   0,
		"client_name":                "Untrusted",
		"redirect_uris":              []string{},
		"grant_types":                []string{"authorization_code"},
		"token_endpoint_auth_method": "client_secret_basic",
	})
}

func (this Server) CallbackHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	uri := req.URL.Query().Get("redirect_uri")
	if uri == "" {
		SendErrorResult(res, ErrNotValid)
		return
	}
	http.Redirect(res, req, fmt.Sprintf(uri+"?code=%s", ctx.Authorization), http.StatusSeeOther)
}
