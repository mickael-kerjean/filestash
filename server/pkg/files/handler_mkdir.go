package files

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

func FileMkdir(ctx *App, res http.ResponseWriter, req *http.Request) {
	if permissions.CanUpload(ctx) == false {
		Log.Debug("mkdir::permission 'permission denied'")
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("mkdir::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Mkdir(ctx, path); err != nil {
			Log.Info("mkdir::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	err = ctx.Backend.Mkdir(path)
	if err != nil {
		Log.Debug("mkdir::backend '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}
