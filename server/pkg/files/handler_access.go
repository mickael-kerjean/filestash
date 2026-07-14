package files

import (
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

func FileAccess(ctx *App, res http.ResponseWriter, req *http.Request) {
	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("access::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	var perms Metadata = Metadata{}
	if obj, ok := ctx.Backend.(interface{ Meta(path string) Metadata }); ok {
		perms = obj.Meta(path)
	}

	allowed := []string{}
	if permissions.CanRead(ctx) {
		if perms.CanSee == nil || *perms.CanSee == true {
			allowed = append(allowed, "GET")
		}
	}
	if permissions.CanEdit(ctx) {
		if (perms.CanCreateFile == nil || *perms.CanCreateFile == true) &&
			(perms.CanCreateDirectory == nil || *perms.CanCreateDirectory == true) {
			allowed = append(allowed, "PUT")
		}
	}
	if permissions.CanUpload(ctx) {
		if perms.CanUpload == nil || *perms.CanUpload == true {
			allowed = append(allowed, "POST")
		}
	}
	header := res.Header()
	header.Set("Allow", strings.Join(allowed, ", "))
	SendSuccessResult(res, nil)
}
