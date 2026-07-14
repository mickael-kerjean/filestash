package files

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

func FileTouch(ctx *App, res http.ResponseWriter, req *http.Request) {
	if permissions.CanUpload(ctx) == false {
		Log.Debug("touch::permission 'permission denied'")
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("touch::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Touch(ctx, path); err != nil {
			Log.Info("touch::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	err = ctx.Backend.Touch(path)
	if err != nil {
		Log.Debug("touch::backend '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}
