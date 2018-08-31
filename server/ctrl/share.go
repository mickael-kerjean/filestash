package ctrl

import (
	"github.com/mickael-kerjean/mux"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/model"
	"net/http"
)

type ShareAPI struct {
	Id           string   `json:"id"`
	Path         string   `json:"path"`
	Role         string   `json:"role"`
	Password     string   `json:"password"`
	Users        []string `json:"users"`
	CanManageOwn bool     `json:"can_manage_own"`
	CanShare     bool     `json:"can_share"`
	Expire       int      `json:"expire"`
	Link         string   `json:"link"`
}

func ShareList(ctx App, res http.ResponseWriter, req *http.Request) {
	p := extractParams(req)
	listOfSharedLinks := model.ShareList(p)
	SendSuccessResults(res, listOfSharedLinks)
}

func ShareUpsert(ctx App, res http.ResponseWriter, req *http.Request) {
	p := extractParams(req)
	err := model.ShareUpsert(p, model.ShareParams{})
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func ShareDelete(ctx App, res http.ResponseWriter, req *http.Request) {
	p := extractParams(req)
	err := model.ShareDelete(p)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func extractParams(req *http.Request) model.ShareKey {
	vars := mux.Vars(req)
	return model.ShareKey{vars["id"], "", ""}
}
