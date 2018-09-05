package ctrl

import (
	"github.com/mickael-kerjean/mux"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/model"
	"net/http"
)

type ShareAPI struct {
	Id           string    `json:"id"`
	Path         string    `json:"path"`
	Role         string    `json:"role"`
	Password     *string   `json:"password"`
	Users        *[]string `json:"users"`
	CanManageOwn *bool     `json:"can_manage_own"`
	CanShare     *bool     `json:"can_share"`
	Expire       *int      `json:"expire"`
	CustomURI    *string   `json:"uri"`
}

func ShareList(ctx App, res http.ResponseWriter, req *http.Request) {
	s := extractParams(req, &ctx)
	listOfSharedLinks := model.ShareList(s)
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
	if err := model.ShareUpsert(s); err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func ShareDelete(ctx App, res http.ResponseWriter, req *http.Request) {
	s := extractParams(req, &ctx)
	if err := model.ShareDelete(s); err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func extractParams(req *http.Request, ctx *App) model.Share {
	return model.Share{
		Id:      NewString(mux.Vars(req)["id"]),
		Backend: NewString(GenerateID(ctx.Session)),
		Path:    NewString(req.URL.Query().Get("path")),
	}
}
