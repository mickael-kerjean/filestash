package files

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

func FileMv(ctx *App, res http.ResponseWriter, req *http.Request) {
	if permissions.CanEdit(ctx) == false {
		Log.Debug("mv::permission 'permission denied'")
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	from, err := PathBuilder(ctx, req.URL.Query().Get("from"))
	if err != nil {
		Log.Debug("mv::path::from '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	to, err := PathBuilder(ctx, req.URL.Query().Get("to"))
	if err != nil {
		Log.Debug("mv::path::to '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	if from == "" || to == "" {
		Log.Debug("mv::params 'missing path parameter'")
		SendErrorResult(res, NewError("missing path parameter", 400))
		return
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Mv(ctx, from, to); err != nil {
			Log.Info("mv::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	err = ctx.Backend.Mv(from, to)
	if err != nil {
		Log.Debug("mv::backend '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}
