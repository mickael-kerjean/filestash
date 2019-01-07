package middleware

import (
	"encoding/json"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
	"github.com/gorilla/mux"
	"net/http"
	"strings"
)

func LoggedInOnly(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		if ctx.Backend == nil || ctx.Session == nil {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		fn(ctx, res, req)
	}
}

func AdminOnly(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		if admin := Config.Get("auth.admin").String(); admin != "" {
			c, err := req.Cookie(COOKIE_NAME_ADMIN);
			if err != nil {
				SendErrorResult(res, ErrPermissionDenied)
				return
			}

			str, err := DecryptString(SECRET_KEY, c.Value);
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

func SessionStart (fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	extractShare := func(req *http.Request, ctx *App, share_id string) (Share, error) {
		if share_id == "" {
			return Share{}, nil
		}

		if Config.Get("features.share.enable").Bool() == false {
			Log.Debug("Share feature isn't enable, contact your administrator")
			return Share{}, NewError("Feature isn't enable, contact your administrator", 405)
		}

		s, err := model.ShareGet(share_id)
		if err != nil {
			return Share{}, nil
		}
		if err = s.IsValid(); err != nil {
			return Share{}, err
		}
		return s, nil
	}
	extractSession := func(req *http.Request, ctx *App) (map[string]string, error) {
		var str string
		var err error
		var res map[string]string = make(map[string]string)

		if ctx.Share.Id != "" {
			var verifiedProof []model.Proof = model.ShareProofGetAlreadyVerified(req, ctx)
			var requiredProof []model.Proof = model.ShareProofGetRequired(ctx.Share)
			var remainingProof []model.Proof = model.ShareProofCalculateRemainings(requiredProof, verifiedProof)
			if len(remainingProof) != 0 {
				return res, NewError("Unauthorized Shared space", 400)
			}
			str = ctx.Share.Auth
			str, err = DecryptString(SECRET_KEY, str)
			if err != nil {
				// This typically happen when changing the secret key
				return res, nil
			}
			err = json.Unmarshal([]byte(str), &res)

			if ctx.Share.Path[len(ctx.Share.Path)-1:] == "/" {
				res["path"] = ctx.Share.Path
			} else {
				path := req.URL.Query().Get("path")
				if strings.HasSuffix(ctx.Share.Path, path) == false {
					return res, ErrPermissionDenied
				}
				res["path"] = strings.TrimSuffix(ctx.Share.Path, path) + "/"
			}
			return res, err
		} else {
			cookie, err := req.Cookie(COOKIE_NAME_AUTH)
			if err != nil {
				return res, nil
			}
			str = cookie.Value
			str, err = DecryptString(SECRET_KEY, str)
			if err != nil {
				// This typically happen when changing the secret key
				return res, nil
			}
			err = json.Unmarshal([]byte(str), &res)
			return res, err
		}
	}
	extractBackend := func(req *http.Request, ctx *App) (IBackend, error) {
		return model.NewBackend(ctx, ctx.Session)
	}

	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		var err error
		share_id := func() string {
			if len(req.URL.Path) > 3 && req.URL.Path[:3] == "/s/" {
				// this runs while using a link as a webdav server
				return mux.Vars(req)["share"]
			}
			return req.URL.Query().Get("share")
		}()
		if ctx.Share, err = extractShare(req, &ctx, share_id); err != nil {
			SendErrorResult(res, err)
			return
		}
		if ctx.Session, err = extractSession(req, &ctx); err != nil {
			SendErrorResult(res, err)
			return
		}
		if ctx.Backend, err = extractBackend(req, &ctx); err != nil {
			SendErrorResult(res, err)
			return
		}
		fn(ctx, res, req)
	}
}
