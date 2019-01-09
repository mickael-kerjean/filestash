package middleware

import (
	"encoding/json"
	"fmt"
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
	extractBackend := func(req *http.Request, ctx *App) (IBackend, error) {
		return model.NewBackend(ctx, ctx.Session)
	}

	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		var err error
		if ctx.Share, err = _extractShare(req); err != nil {
			SendErrorResult(res, err)
			return
		}
		if ctx.Session, err = _extractSession(req, &ctx); err != nil {
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

func RedirectSharedLoginIfNeeded(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		share_id := _extractShareId(req)
		if share_id == "" {
			SendErrorResult(res, ErrNotValid)
			return
		}

		share, err := _extractShare(req);
		if err != nil || share_id != share.Id {
			http.Redirect(res, req, fmt.Sprintf("/s/%s?next=%s", share_id, req.URL.Path), http.StatusTemporaryRedirect)
			return
		}
		fn(ctx, res, req)
	}
}

func CanManageShare(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		share_id := mux.Vars(req)["share"]
		if share_id == "" {
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
			SendErrorResult(res, err)
			return
		}

		// In a scenario where the shared link has already been atributed, we need to make sure
		// the user that's currently logged in can manage the link. 2 scenarios here:
		// 1) scenario 1: the user is the very same one that generated the shared link in the first place
		if ctx.Session, err = _extractSession(req, &ctx); err != nil {
			SendErrorResult(res, err)
			return
		}
		if s.Backend == GenerateID(&ctx) {
			fn(ctx, res, req)
			return
		}
		// 2) scenario 2: the user is different than the one that has generated the shared link
		// in this scenario, the link owner might have granted for user the right to reshare links
		if ctx.Share, err = _extractShare(req); err != nil {
			SendErrorResult(res, err)
			return
		}
		if ctx.Session, err = _extractSession(req, &ctx); err != nil {
			SendErrorResult(res, err)
			return
		}

		if s.Backend == GenerateID(&ctx) {
			if s.CanShare == true {
				fn(ctx, res, req)
				return
			}
		}
		SendErrorResult(res, ErrPermissionDenied)
		return
	}
}

func _extractShareId(req *http.Request) string {
	share := req.URL.Query().Get("share")
	if share != "" {
		return share
	}
	m := mux.Vars(req)["share"]
	if m == "me" {
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

	var verifiedProof []model.Proof = model.ShareProofGetAlreadyVerified(req)
	var requiredProof []model.Proof = model.ShareProofGetRequired(s)
	var remainingProof []model.Proof = model.ShareProofCalculateRemainings(requiredProof, verifiedProof)
	if len(remainingProof) != 0 {
		return Share{}, NewError("Unauthorized Shared space", 400)
	}
	return s, nil
}

func _extractSession(req *http.Request, ctx *App) (map[string]string, error) {
	var str string
	var err error
	var res map[string]string = make(map[string]string)

	if ctx.Share.Id != "" {
		str, err = DecryptString(SECRET_KEY, ctx.Share.Auth)
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
