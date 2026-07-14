package files

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

func FileRm(ctx *App, res http.ResponseWriter, req *http.Request) {
	if permissions.CanEdit(ctx) == false {
		Log.Debug("rm::permission 'permission denied'")
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("rm::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Rm(ctx, path); err != nil {
			Log.Info("rm::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	err = ctx.Backend.Rm(path)
	if err != nil {
		Log.Debug("rm::backend '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}
