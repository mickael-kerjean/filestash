package share

import (
	"net/http"
	"path/filepath"
	"slices"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/net/webdav"
)

func WebdavHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	if ctx.Share.Id == "" {
		http.NotFound(res, req)
		return
	}

	var isAllowed bool
	switch req.Method {
	case "OPTIONS", "HEAD", "GET", "PROPFIND":
		isAllowed = permissions.CanRead(ctx)
	case "MKCOL", "DELETE", "COPY", "MOVE", "PROPPATCH":
		isAllowed = permissions.CanEdit(ctx)
	case "PUT", "LOCK", "UNLOCK":
		isAllowed = permissions.CanEdit(ctx) && permissions.CanUpload(ctx)
	default:
		SendErrorResult(res, ErrNotImplemented)
		return
	}
	if isAllowed == false {
		SendErrorResult(res, ErrPermissionDenied)
		return
	}

	(&webdav.Handler{
		Prefix:     "/s/" + ctx.Share.Id,
		FileSystem: NewWebdavFs(ctx.Backend, ctx.Share.Backend, ctx.Share.Path, req),
		LockSystem: NewWebdavLock(),
	}).ServeHTTP(res, req)
}

/*
 * OSX ask for a lot of crap while mounting as a network drive. To avoid wasting resources with such
 * an imbecile and considering we can't even see the source code they are running, the best approach we
 * could go on is: "crap in, crap out" where useless request coming in are identified and answer appropriatly
 */
func WebdavBlacklist(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		name := filepath.Base(req.URL.String())
		isAppleDouble := strings.HasPrefix(name, "._")
		switch req.Method {
		case "PUT", "MKCOL":
			if isAppleDouble || slices.Contains([]string{".DS_Store", ".localized"}, name) {
				res.WriteHeader(http.StatusMethodNotAllowed)
				return
			}
		case "PROPFIND":
			if isAppleDouble || slices.Contains([]string{
				".DS_Store", ".localized", ".hidden", ".Spotlight-V100",
				".ql_disablethumbnails", ".ql_disablecache",
				".metadata_never_index", ".metadata_never_index_unless_rootfs",
				"Contents",
			}, name) {
				res.WriteHeader(http.StatusForbidden)
				return
			}
		case "GET", "DELETE":
			if name == ".DS_Store" {
				res.WriteHeader(http.StatusForbidden)
				return
			}
		case "LOCK", "UNLOCK":
			if name == ".DS_Store" {
				res.WriteHeader(http.StatusMethodNotAllowed)
				return
			}
		}
		fn(ctx, res, req)
	})
}
