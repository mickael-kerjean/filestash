package middleware

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
	"github.com/mickael-kerjean/filestash/server/pkg/share"
	"github.com/mickael-kerjean/filestash/server/pkg/token"
	"github.com/mickael-kerjean/filestash/server/pkg/env"

	"github.com/gorilla/mux"
)

func LoggedInOnly(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if ctx.Backend == nil || ctx.Session == nil {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		fn(ctx, res, req)
	})
}

func SessionStart(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		var err error
		if ctx.Share, err = _extractShare(req); err != nil {
			SendErrorResult(res, err)
			return
		}
		ctx.Authorization = token.Extract(req)
		if ctx.Session, err = _extractSession(req, ctx); err != nil {
			share.RecoverFromBadCookie(res)
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
		ctx.Languages = _extractLanguages(req)

		fn(ctx, res, req)
	})
}

func SessionTry(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		ctx.Share, _ = _extractShare(req)
		ctx.Authorization = token.Extract(req)
		ctx.Session, _ = _extractSession(req, ctx)
		ctx.Backend, _ = _extractBackend(req, ctx)

		fn(ctx, res, req)
	})
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
	s, err := share.Get(share_id)
	if err != nil {
		return Share{}, nil
	}
	if err = s.IsValid(); err != nil {
		return Share{}, err
	}
	verifiedProof := share.Verified(req)
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
		if Hash(usr[1]+env.SECRET_KEY_DERIVATE_FOR_HASH, 10) != usr[2] {
			return "", p
		}
		return usr[1], p
	}(req.Header.Get("Authorization"))
	if s.Users != nil && username != "" {
		if v, ok := share.VerifyEmail(*s.Users, username); ok {
			verifiedProof = append(verifiedProof, share.Proof{Key: "email", Value: v})
		}
	}
	if s.Password != nil && password != "" {
		if v, ok := share.VerifyPassword(*s.Password, password); ok {
			verifiedProof = append(verifiedProof, share.Proof{Key: "password", Value: v})
		}
	}
	if remainingProof := share.Remainings(share.Required(s), verifiedProof); len(remainingProof) != 0 {
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
	if ctx.Share.Id != "" {
		str, err = DecryptString(env.SECRET_KEY_DERIVATE_FOR_USER, ctx.Share.Auth)
		if err != nil {
			// This typically happen when changing the secret key
			return session, ErrNotAuthorized
		}
		err = json.Unmarshal([]byte(str), &session)
		session["path"] = ctx.Share.Path
		return session, err
	}
	if ctx.Authorization == "" {
		return session, nil
	}
	str, err = DecryptString(env.SECRET_KEY_DERIVATE_FOR_USER, ctx.Authorization)
	if err != nil {
		// This typically happen when changing the secret key
		Log.Debug("middleware::session decrypt error '%s'", err.Error())
		return session, ErrNotAuthorized
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

func _extractLanguages(req *http.Request) []string {
	var lng = []string{}
	for _, lngs := range strings.Split(req.Header.Get("Accept-Language"), ",") {
		chunks := strings.Split(lngs, ";")
		if len(chunks) == 0 {
			continue
		}
		lng = append(lng, chunks[0])
	}
	return lng
}
