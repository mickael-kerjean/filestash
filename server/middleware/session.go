package middleware

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
	"net/http"
	"regexp"
	"strings"
	"time"
)

func LoggedInOnly(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if ctx.Backend == nil || ctx.Session == nil {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		fn(ctx, res, req)
	}
}

func AdminOnly(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if admin := Config.Get("auth.admin").String(); admin != "" {
			c, err := req.Cookie(COOKIE_NAME_ADMIN)
			if err != nil {
				SendErrorResult(res, ErrPermissionDenied)
				return
			}

			str, err := DecryptString(SECRET_KEY_DERIVATE_FOR_ADMIN, c.Value)
			if err != nil {
				SendErrorResult(res, ErrPermissionDenied)
				return
			}
			token := AdminToken{}
			json.Unmarshal([]byte(str), &token)

			if token.IsValid() == false || token.IsAdmin() == false {
				SendErrorResult(res, ErrPermissionDenied)
				return
			}
		}
		fn(ctx, res, req)
	}
}

func SessionStart(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		var err error

		if ctx.Share, err = _extractShare(req); err != nil {
			SendErrorResult(res, err)
			return
		}
		ctx.Authorization = _extractAuthorization(req)
		if ctx.Session, err = _extractSession(req, ctx); err != nil {
			SendErrorResult(res, err)
			return
		}
		if ctx.Backend, err = _extractBackend(req, ctx); err != nil {
			if len(ctx.Session) == 0 {
				SendErrorResult(res, ErrNotAuthorized)
				return
			}
			SendErrorResult(res, err)
			return
		}
		fn(ctx, res, req)
	}
}

func SessionTry(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		ctx.Share, _ = _extractShare(req)
		ctx.Authorization = _extractAuthorization(req)
		ctx.Session, _ = _extractSession(req, ctx)
		ctx.Backend, _ = _extractBackend(req, ctx)
		fn(ctx, res, req)
	}
}

func RedirectSharedLoginIfNeeded(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		share_id := _extractShareId(req)
		if share_id == "" {
			if mux.Vars(req)["share"] == "private" {
				fn(ctx, res, req)
				return
			}
			SendErrorResult(res, ErrNotValid)
			return
		}

		share, err := _extractShare(req)
		if err != nil || share_id != share.Id {
			http.Redirect(res, req, fmt.Sprintf("/s/%s?next=%s", share_id, req.URL.Path), http.StatusTemporaryRedirect)
			return
		}
		fn(ctx, res, req)
	}
}

func CanManageShare(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		share_id := mux.Vars(req)["share"]
		if share_id == "" {
			Log.Debug("middleware::session::share 'invalid share id'")
			SendErrorResult(res, ErrNotValid)
			return
		}

		// anyone can manage a share_id that's not been attributed yet
		s, err := model.ShareGet(share_id)
		if err != nil {
			if err == ErrNotFound {
				SessionStart(fn)(ctx, res, req)
				return
			}
			Log.Debug("middleware::session::share 'cannot get share - %s'", err.Error())
			SendErrorResult(res, err)
			return
		}

		// In a scenario where the shared link has already been atributed, we need to make sure
		// the user that's currently logged in can manage the link. 2 scenarios here:
		// 1) scenario 1: the user is the very same one that generated the shared link in the first place
		ctx.Share = Share{}
		if ctx.Session, err = _extractSession(req, ctx); err != nil {
			Log.Debug("middleware::session::share 'cannot extract session - %s'", err.Error())
			SendErrorResult(res, err)
			return
		}
		if s.Backend == GenerateID(ctx) {
			fn(ctx, res, req)
			return
		}
		// 2) scenario 2: the user is different than the one that has generated the shared link
		// in this scenario, the link owner might have granted for user the right to reshare links
		if ctx.Share, err = _extractShare(req); err != nil {
			Log.Debug("middleware::session::share 'cannot extract share - %s'", err.Error())
			SendErrorResult(res, err)
			return
		}
		if ctx.Session, err = _extractSession(req, ctx); err != nil {
			Log.Debug("middleware::session::share 'cannot extract session 2 - %s'", err.Error())
			SendErrorResult(res, err)
			return
		}

		id := GenerateID(ctx)
		if s.Backend == id {
			if s.CanShare == true {
				fn(ctx, res, req)
				return
			}
		}
		Log.Debug("middleware::session::share 'permission denied - s.CanShare[%+v] s.Backend[%s] GenerateID[%s]'", s.CanShare, s.Backend, id)
		SendErrorResult(res, ErrPermissionDenied)
		return
	}
}

func _extractAuthorization(req *http.Request) (token string) {
	// strategy 1: split cookie
	index := 0
	for {
		cookie, err := req.Cookie(CookieName(index))
		if err != nil {
			break
		}
		index++
		token += cookie.Value
	}
	// strategy 2: Authorization header
	if token == "" {
		authHeader := req.Header.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(req.Header.Get("Authorization"), "Bearer ")
		}
	}
	// strategy 3: Authorization query param
	if token == "" {
		if auth := req.URL.Query().Get("authorization"); auth != "" {
			token = auth
		}
	}
	return token
}

func _extractShareId(req *http.Request) string {
	share := req.URL.Query().Get("share")
	if share != "" {
		return share
	}
	m := mux.Vars(req)["share"]
	if m == "private" {
		return ""
	}
	return m
}

func _extractShare(req *http.Request) (Share, error) {
	var err error
	share_id := _extractShareId(req)
	if share_id == "" {
		return Share{}, nil
	}
	if Config.Get("features.share.enable").Bool() == false {
		Log.Debug("Share feature isn't enabled, contact your administrator")
		return Share{}, NewError("Feature isn't enabled, contact your administrator", 405)
	}

	s, err := model.ShareGet(share_id)
	if err != nil {
		return Share{}, nil
	}
	if err = s.IsValid(); err != nil {
		return Share{}, err
	}

	var verifiedProof []model.Proof = model.ShareProofGetAlreadyVerified(req)
	username, password := func(authHeader string) (string, string) {
		decoded, err := base64.StdEncoding.DecodeString(
			strings.TrimPrefix(authHeader, "Basic "),
		)
		if err != nil {
			return "", ""
		}
		s := bytes.Split(decoded, []byte(":"))
		if len(s) < 2 {
			return "", ""
		}
		p := string(bytes.Join(s[1:], []byte(":")))
		usr := regexp.MustCompile(`^(.*)\[([0-9a-zA-Z]+)\]$`).FindStringSubmatch(string(s[0]))
		if len(usr) != 3 {
			return "", p
		}
		if Hash(usr[1]+SECRET_KEY_DERIVATE_FOR_HASH, 10) != usr[2] {
			return "", p
		}
		return usr[1], p
	}(req.Header.Get("Authorization"))

	if s.Users != nil && username != "" {
		if v, ok := model.ShareProofVerifierEmail(*s.Users, username); ok {
			verifiedProof = append(verifiedProof, model.Proof{Key: "email", Value: v})
		}
	}
	if s.Password != nil && password != "" {
		if v, ok := model.ShareProofVerifierPassword(*s.Password, password); ok {
			verifiedProof = append(verifiedProof, model.Proof{Key: "password", Value: v})
		}
	}
	var requiredProof []model.Proof = model.ShareProofGetRequired(s)
	var remainingProof []model.Proof = model.ShareProofCalculateRemainings(requiredProof, verifiedProof)
	if len(remainingProof) != 0 {
		return Share{}, NewError("Unauthorized Shared space", 400)
	}
	return s, nil
}

func _extractSession(req *http.Request, ctx *App) (map[string]string, error) {
	var (
		str     string
		err     error
		session map[string]string = make(map[string]string)
	)

	if ctx.Share.Id != "" { // Shared link
		str, err = DecryptString(SECRET_KEY_DERIVATE_FOR_USER, ctx.Share.Auth)
		if err != nil {
			// This typically happen when changing the secret key
			return session, nil
		}
		err = json.Unmarshal([]byte(str), &session)
		if IsDirectory(ctx.Share.Path) {
			session["path"] = ctx.Share.Path
		} else {
			// when the shared link is pointing to a file, we mustn't have access to the surroundings
			// => we need to take extra care of which path to use as a chroot
			var path string = req.URL.Query().Get("path")
			if strings.HasPrefix(req.URL.Path, "/api/export/") == true {
				var re = regexp.MustCompile(`^/api/export/[^\/]+/[^\/]+/[^\/]+(\/.+)$`)
				path = re.ReplaceAllString(req.URL.Path, `$1`)
			}
			if strings.HasSuffix(ctx.Share.Path, path) == false {
				return make(map[string]string), ErrPermissionDenied
			}
			session["path"] = strings.TrimSuffix(ctx.Share.Path, path) + "/"
		}
		return session, err
	}

	if ctx.Authorization == "" {
		return session, nil
	}
	str, err = DecryptString(SECRET_KEY_DERIVATE_FOR_USER, ctx.Authorization)
	if err != nil {
		// This typically happen when changing the secret key
		Log.Debug("middleware::session decrypt error '%s'", err.Error())
		return session, nil
	}
	if err = json.Unmarshal([]byte(str), &session); err != nil {
		return session, err
	}
	t, err := time.Parse(time.RFC3339, session["timestamp"])
	if err != nil {
		Log.Warning("middleware::session 'cannot parse time - %s'", err.Error())
		return session, ErrNotAuthorized
	} else if t.Add(24 * 365 * time.Hour).Before(time.Now()) {
		Log.Warning("middleware::session 'cookie too old - %s'", t.Format(time.RFC3339))
		return session, ErrNotAuthorized
	}
	return session, err
}

func _extractBackend(req *http.Request, ctx *App) (IBackend, error) {
	return model.NewBackend(ctx, ctx.Session)
}
