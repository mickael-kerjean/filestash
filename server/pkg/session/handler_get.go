package session

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/files"
	"github.com/mickael-kerjean/filestash/server/pkg/journal"
)

func SessionGet(ctx *App, res http.ResponseWriter, req *http.Request) {
	op := journal.PublishSession(ctx, req, "get")
	defer op.Close(res)
	r := Session{
		IsAuth: false,
	}
	if ctx.Backend == nil {
		SendSuccessResult(res, r)
		return
	}
	home, err := files.GetHome(ctx.Backend, ctx.Session["path"])
	if err != nil {
		SendSuccessResult(res, r)
		return
	} else if ctx.Share.Id != "" {
		home = "/"
	}
	r.IsAuth = true
	r.Home = NewString(home)
	r.Backend = backendID(ctx.Session)
	if ctx.Share.Id == "" && Config.Get("features.protection.enable_chromecast").Bool() {
		r.Authorization = ctx.Authorization
	}
	SendSuccessResult(res, r)
}
