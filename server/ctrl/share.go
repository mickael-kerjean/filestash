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
	s := extractParams(req, &ctx)
	listOfSharedLinks, err := model.ShareList(&s)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResults(res, listOfSharedLinks)
}

func ShareGet(ctx App, res http.ResponseWriter, req *http.Request) {
	s := extractParams(req, &ctx)
	if err := model.ShareGet(&s); err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, struct{
		Id string `json:"id"`
		Path string `json:"path"`
	}{
		Id: s.Id,
		Path: s.Path,
	})
}

func ShareUpsert(ctx App, res http.ResponseWriter, req *http.Request) {
	if model.CanShare(&ctx) == false {
		SendErrorResult(res, NewError("No permission", 403))
		return
	}

	s := extractParams(req, &ctx)
	s.Path = NewStringFromInterface(ctx.Body["path"])
	s.Auth = func(req *http.Request) string {
		c, _ := req.Cookie(COOKIE_NAME_AUTH)
		if c == nil {
			return ""
		}
		var data map[string]string
		str, err := DecryptString(ctx.Config.Get("general.secret_key").String(), c.Value)
		if err != nil {
			return ""
		}
		if err = json.Unmarshal([]byte(str), &data); err != nil {
			return ""
		}

		boolToString := func(b bool) string {
			if b == true {
				return "yes"
			}
			return "no"
		}
		data["path"] = func(p1 string, p2 string) string{
			if p1 == "" {
				return p2
			}
			return p1 + strings.TrimPrefix(p2, "/")
		}(ctx.Session["path"], s.Path)
		data["can_share"] = boolToString(s.CanShare)
		data["can_read"] = boolToString(s.CanRead)
		data["can_write"] = boolToString(s.CanWrite)
		data["can_upload"] = boolToString(s.CanUpload)

		s, err := json.Marshal(data);
		if err != nil {
			return ""
		}
		obfuscate, err := EncryptString(ctx.Config.Get("general.secret_key").String(), string(s))
		if err != nil {
			return ""
		}
		return obfuscate
	}(req)

	if err := model.ShareUpsert(&s); err != nil {
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
	var s model.Share

	// 1) initialise the current context
	s = extractParams(req, &ctx)
	if err := model.ShareGet(&s); err != nil {
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
		SendErrorResult(res, NewError("Input error", 405))
		return
	}
	if _, err := s.IsValid(); err != nil {
		SendErrorResult(res, err)
		return
	}

	// 3) process the proof sent by the user
	submittedProof, err := model.ShareProofVerifier(&ctx, s, submittedProof);
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

	// log.Println("============")
	// log.Println("REQUIRED:  ", requiredProof)
	// log.Println("SUBMITTED: ", submittedProof)
	// log.Println("VERIFIED:  ", verifiedProof)
	// log.Println("REMAINING: ", remainingProof)
	// log.Println("============")

	// 5) persist proofs in client cookie
	cookie := http.Cookie{
		Name: COOKIE_NAME_PROOF,
		Value: func(p []model.Proof) string {
			j, _ := json.Marshal(p)
			str, _ := EncryptString(ctx.Config.Get("general.secret_key").String(), string(j))
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

func ShareDelete(ctx App, res http.ResponseWriter, req *http.Request) {
	s := extractParams(req, &ctx)

	if err := model.ShareDelete(&s); err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func extractParams(req *http.Request, ctx *App) model.Share {
	return model.Share{
		Auth: "",
		Id:           NewStringFromInterface(mux.Vars(req)["share"]),
		Backend:      NewStringFromInterface(GenerateID(ctx.Session)),
		Path:         NewStringFromInterface(req.URL.Query().Get("path")),
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
}
