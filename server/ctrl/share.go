package ctrl

import (
	"github.com/mickael-kerjean/mux"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/model"
	"net/http"
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
	SendSuccessResult(res, s)
}

func ShareUpsert(ctx App, res http.ResponseWriter, req *http.Request) {
	s := extractParams(req, &ctx)
	s.Path = NewStringFromInterface(ctx.Body["path"])

	if err := model.ShareUpsert(&s); err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func ShareGiveProof(ctx App, res http.ResponseWriter, req *http.Request) {
	// switch NewStringFromInterface(ctx.Body["type"]) {
	// case "password":
	// case "code": nil
	// case "email": nil
	// }
	SendSuccessResult(res, false)
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
		Id:      NewStringFromInterface(mux.Vars(req)["id"]),
		Backend: NewStringFromInterface(GenerateID(ctx.Session)),
		Path:    NewStringFromInterface(req.URL.Query().Get("path")),
		Password: NewStringpFromInterface(ctx.Body["password"]),
		Users: NewStringpFromInterface(ctx.Body["users"]),
		Expire: NewIntpFromInterface(ctx.Body["expire"]),
		Url: NewStringpFromInterface(ctx.Body["url"]),
		CanManageOwn: NewBoolFromInterface(ctx.Body["can_manage_own"]),
		CanShare: NewBoolFromInterface(ctx.Body["can_share"]),
		CanRead: NewBoolFromInterface(ctx.Body["can_read"]),
		CanWrite: NewBoolFromInterface(ctx.Body["can_write"]),
		CanUpload: NewBoolFromInterface(ctx.Body["can_upload"]),
	}
}
