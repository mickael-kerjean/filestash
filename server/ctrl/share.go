package ctrl

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
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

func ShareUpsert(ctx App, res http.ResponseWriter, req *http.Request) {
	s := Share{
		Id:           mux.Vars(req)["share"],
		Auth: func() string {
			if ctx.Share.Id == "" {
				a, err := req.Cookie(COOKIE_NAME_AUTH)
				if err != nil {
					return ""
				}
				return a.Value
			}
			return ctx.Share.Auth
		}(),
		Backend: func () string {
			if ctx.Share.Id == "" {
				return GenerateID(&ctx)
			}
			return ctx.Share.Backend
		}(),
	    Path: func () string {
			leftPath := "/"
			rightPath := strings.TrimPrefix(NewStringFromInterface(ctx.Body["path"]), "/")
			if ctx.Share.Id != "" {
				leftPath = ctx.Share.Path
			} else {
				if ctx.Session["path"] != "" {
					leftPath = ctx.Session["path"]
				}
			}
			return leftPath + rightPath
		}(),
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
	verifiedProof = model.ShareProofGetAlreadyVerified(req)
	requiredProof = model.ShareProofGetRequired(s)

	// 2) validate the current context
	if len(verifiedProof) > 20 || len(requiredProof) > 20 {
		http.SetCookie(res, &http.Cookie{
			Name:   COOKIE_NAME_PROOF,
			Value:  "",
			MaxAge: -1,
			Path:   COOKIE_PATH,
		})
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

	if submittedProof.Key != "" {
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
		SameSite: http.SameSiteStrictMode,
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
		Path: s.Path,
	})
}
