package share

import (
	"encoding/json"
	"net/http"
	"slices"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/cookie"
	"github.com/mickael-kerjean/filestash/server/pkg/files"
	"github.com/mickael-kerjean/filestash/server/pkg/token"

	"github.com/gorilla/mux"
)

func ShareListHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	if ctx.Share.Id != "" {
		SendErrorResult(res, ErrPermissionDenied)
		return
	}
	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	shares, err := ShareList(
		GenerateID(ctx.Session),
		path,
	)
	if err != nil {
		Log.Debug("pkg::share::handler::list error=%q", err)
		SendErrorResult(res, err)
		return
	}
	for i := 0; i < len(shares); i++ {
		shares[i].Path = "/" + strings.TrimPrefix(shares[i].Path, path)
		shares[i].Auth = ""
		if shares[i].Password != nil {
			shares[i].Password = NewString(PASSWORD_DUMMY)
		}
	}
	SendSuccessResults(res, shares)
}

func ShareUpsertHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	shareID := mux.Vars(req)["share"]
	path, err := PathBuilder(ctx, NewStringFromInterface(ctx.Body["path"]))
	if err != nil {
		SendErrorResult(res, err)
		return
	} else if backend, err := files.NewBackend(ctx, ctx.Session); err != nil {
		SendErrorResult(res, err)
		return
	} else if _, err = backend.Stat(path); err != nil {
		SendErrorResult(res, err)
		return
	}
	share := Share{
		Id:        shareID,
		Auth:      token.From(req),
		Backend:   GenerateID(ctx.Session),
		Path:      path,
		Password:  NewStringpFromInterface(ctx.Body["password"]),
		Users:     NewStringpFromInterface(ctx.Body["users"]),
		Expire:    nil,
		CanRead:   NewBoolFromInterface(ctx.Body["can_read"]),
		CanWrite:  NewBoolFromInterface(ctx.Body["can_write"]),
		CanUpload: NewBoolFromInterface(ctx.Body["can_upload"]),
	}
	if share.Password != nil && *share.Password == "" {
		share.Password = nil
	}
	if share.Users != nil && *share.Users == "" {
		share.Users = nil
	}
	if date := NewStringFromInterface(ctx.Body["expire"]); date != "" {
		expire, err := time.Parse(time.DateOnly, date)
		if err != nil {
			SendErrorResult(res, ErrNotValid)
			return
		}
		share.Expire = NewInt64pFromInterface(expire.UnixMilli())
	}
	if err := ShareUpsert(&share); err != nil {
		Log.Debug("pkg::share::handler::upsert error=%q", err.Error())
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func ShareDeleteHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	shareID := mux.Vars(req)["share"]
	if err := ShareDelete(shareID); err != nil {
		Log.Debug("pkg::share::handler::delete error=%q", err.Error())
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func ShareVerifyProofHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	var (
		submittedProof Proof
		verifiedProof  []Proof
		requiredProof  []Proof
		remainingProof []Proof
		share          Share
		err            error
	)

	// 1) initialise the current context
	share, err = ShareGet(mux.Vars(req)["share"])
	if err != nil {
		Log.Debug("pkg::share::handler action=proof_init error=%q", err)
		SendErrorResult(res, err)
		return
	}
	submittedProof = Proof{
		Key:   NewStringFromInterface(ctx.Body["type"]),
		Value: NewStringFromInterface(ctx.Body["value"]),
	}
	if !slices.Contains([]string{"", "password", "email", "code"}, submittedProof.Key) {
		SendErrorResult(res, ErrNotValid)
		return
	}
	verifiedProof = ShareVerified(req)
	requiredProof = ShareRequired(share)

	// 2) validate the current context
	if err := ShareIsValid(share); err != nil {
		Log.Debug("pkg::share::handler action=proof_validate error=%q", err)
		SendErrorResult(res, err)
		return
	}

	// 3) process the proof sent by the user
	time.Sleep(1000 * time.Millisecond)
	submittedProof, err = ShareVerify(share, submittedProof)
	if err != nil {
		Log.Debug("pkg::share::handler action=proof_verify error=%q", err)
		submittedProof.Error = NewString(err.Error())
		SendSuccessResult(res, submittedProof)
		return
	}
	if submittedProof.Key == "code" {
		submittedProof.Message = NewString("We've sent you a message with a verification code")
		SendSuccessResult(res, submittedProof)
		return
	}

	if submittedProof.Key != "" {
		submittedProof.Id = Hash(submittedProof.Key+"::"+submittedProof.Value, 20)
		alreadyExist := false
		for i := 0; i < len(verifiedProof); i++ {
			if verifiedProof[i].Id == submittedProof.Id {
				alreadyExist = true
				break
			}
		}
		if alreadyExist == false {
			verifiedProof = append(verifiedProof, submittedProof)
		}
	}

	// 4) Find remaining proofs: requiredProof - verifiedProof
	remainingProof = ShareRemainings(requiredProof, verifiedProof)

	// 5) persist proofs in client cookie
	http.SetCookie(res, cookie.Create(&http.Cookie{
		Name: COOKIE_NAME_PROOF,
		Value: func(p []Proof) string {
			j, _ := json.Marshal(p)
			str, _ := EncryptString(SECRET_KEY_DERIVATE_FOR_PROOF, string(j))
			return str
		}(verifiedProof),
		Path:   COOKIE_PATH,
		MaxAge: 60 * 60 * 24 * 30,
	}, cookie.WithRules(req)))
	if len(remainingProof) > 0 {
		SendSuccessResult(res, remainingProof[0])
		return
	}
	SendSuccessResult(res, struct {
		Id        string `json:"id"`
		Path      string `json:"path"`
		CanRead   bool   `json:"can_read"`
		CanWrite  bool   `json:"can_write"`
		CanUpload bool   `json:"can_upload"`
	}{
		Id: share.Id,
		Path: func() string {
			_, filename := SplitPath(share.Path)
			return "/" + filename
		}(),
		CanRead:   share.CanRead,
		CanWrite:  share.CanWrite,
		CanUpload: share.CanUpload,
	})
}
