package ctrl

import (
	"encoding/json"
	"fmt"
	"github.com/mickael-kerjean/mux"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/model"
	"net/http"
	"strings"
)

func ShareList(ctx App, res http.ResponseWriter, req *http.Request) {
	listOfSharedLinks, err := model.ShareList(
		GenerateID(&ctx),
		req.URL.Query().Get("path"),
	)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResults(res, listOfSharedLinks)
}

func ShareGet(ctx App, res http.ResponseWriter, req *http.Request) {
	share_id := mux.Vars(req)["share"]
	s, err := model.ShareGet(share_id);
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, struct{
		Id string `json:"id"`
		Path string `json:"path"`
	}{
		Id: s.Id,
		//Path: s.Path,
		Path: "/",
	})
}

func ShareUpsert(ctx App, res http.ResponseWriter, req *http.Request) {
	share_target := mux.Vars(req)["share"]

	// Make sure the current user is allowed to do that
	backend_id := ""
	path_from := "/"
	auth_cookie := ""

	if ctx.Share.Id != "" {
		if ctx.Share.CanShare != true {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		backend_id = ctx.Share.Backend
		auth_cookie = ctx.Share.Auth
		path_from = ctx.Share.Path
	} else {
		backend_id = GenerateID(&ctx)
		auth_cookie = func() string {
			a, err := req.Cookie("auth")
			if err != nil {
				return "N/A"
			}
			return a.Value
		}()
	}

	if ctx.Share.Id != "" {
		if backend_id != ctx.Share.Backend {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
	}

	// Perform upsert
	s := Share{
		Id:           share_target,
		Auth:         auth_cookie,
		Backend:      backend_id,
		Path:         path_from + strings.TrimPrefix(NewStringFromInterface(ctx.Body["path"]), "/"),
		Password:     NewStringpFromInterface(ctx.Body["password"]),
		Users:        NewStringpFromInterface(ctx.Body["users"]),
		Expire:       NewInt64pFromInterface(ctx.Body["expire"]),
		Url:          NewStringpFromInterface(ctx.Body["url"]),
		CanManageOwn: NewBoolFromInterface(ctx.Body["can_manage_own"]),
		CanShare:     NewBoolFromInterface(ctx.Body["can_share"]),
		CanRead:      NewBoolFromInterface(ctx.Body["can_read"]),
		CanWrite:     NewBoolFromInterface(ctx.Body["can_write"]),
		CanUpload:    NewBoolFromInterface(ctx.Body["can_upload"]),
	}
	if err := model.ShareUpsert(&s); err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func ShareDelete(ctx App, res http.ResponseWriter, req *http.Request) {
	share_target := mux.Vars(req)["share"]
	share_current := req.URL.Query().Get("share");

	// Make sure the current user is allowed to do that
	backend_id := GenerateID(&ctx)
	if share_current != "" {
		share, err := model.ShareGet(share_current);
		if err != nil {
			SendErrorResult(res, ErrNotFound)
			return
		} else if share.CanShare != true {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		backend_id = share.Backend
	}
	share, err := model.ShareGet(share_target);
	if err == nil {
		if backend_id != share.Backend {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
	}

	// Remove the share
	if err := model.ShareDelete(share_target); err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func ShareVerifyProof(ctx App, res http.ResponseWriter, req *http.Request) {
	var submittedProof model.Proof
	var verifiedProof []model.Proof
	var requiredProof []model.Proof
	var remainingProof []model.Proof
	var s Share
	var err error

	// 1) initialise the current context
	share_id := mux.Vars(req)["share"]
	s, err = model.ShareGet(share_id);
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	submittedProof = model.Proof{
		Key: fmt.Sprint(ctx.Body["type"]),
		Value: fmt.Sprint(ctx.Body["value"]),
	}
	verifiedProof = model.ShareProofGetAlreadyVerified(req, &ctx)
	requiredProof = model.ShareProofGetRequired(s)

	// 2) validate the current context
	if len(verifiedProof) > 20 || len(requiredProof) > 20 {
		SendErrorResult(res, ErrNotValid)
		return
	}
	if err := s.IsValid(); err != nil {
		SendErrorResult(res, err)
		return
	}

	// 3) process the proof sent by the user
	submittedProof, err = model.ShareProofVerifier(&ctx, s, submittedProof);
	if err != nil {
		submittedProof.Error = NewString(err.Error())
		SendSuccessResult(res, submittedProof)
		return
	}
	if submittedProof.Key == "code" {
		submittedProof.Value = ""
		submittedProof.Message = NewString("We've sent you a message with a verification code")
		SendSuccessResult(res, submittedProof)
		return
	}

	if submittedProof.Key != "<nil>" {
		submittedProof.Id = Hash(submittedProof.Key + "::" + submittedProof.Value)
		verifiedProof = append(verifiedProof, submittedProof)
	}

	// 4) Find remaining proofs: requiredProof - verifiedProof
	remainingProof = model.ShareProofCalculateRemainings(requiredProof, verifiedProof)

	// 5) persist proofs in client cookie
	cookie := http.Cookie{
		Name: COOKIE_NAME_PROOF,
		Value: func(p []model.Proof) string {
			j, _ := json.Marshal(p)
			str, _ := EncryptString(SECRET_KEY, string(j))
			return str
		}(verifiedProof),
		Path: COOKIE_PATH,
		MaxAge: 60 * 60 * 24 * 30,
		HttpOnly: true,
	}
	http.SetCookie(res, &cookie)

	if len(remainingProof) > 0 {
		SendSuccessResult(res, remainingProof[0])
		return
	}

	SendSuccessResult(res, struct {
		Id string   `json:"id"`
		Path string `json:"path"`
	}{
		Id: s.Id,
		Path: "/",
	})
}
