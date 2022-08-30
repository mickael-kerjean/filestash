package ctrl

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
	"github.com/mickael-kerjean/net/webdav"
	"net/http"
	"path/filepath"
	"strings"
)

func WebdavHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	if ctx.Share.Id == "" {
		http.NotFound(res, req)
		return
	}

	// https://github.com/golang/net/blob/master/webdav/webdav.go#L49-L68
	canRead := model.CanRead(ctx)
	canWrite := model.CanRead(ctx)
	canUpload := model.CanUpload(ctx)
	switch req.Method {
	case "OPTIONS", "GET", "HEAD", "POST", "PROPFIND":
		if canRead == false {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
	case "MKCOL", "DELETE", "COPY", "MOVE", "PROPPATCH":
		if canWrite == false {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
	case "PUT", "LOCK", "UNLOCK":
		if canWrite == false && canUpload == false {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
	default:
		SendErrorResult(res, ErrNotImplemented)
		return
	}

	h := &webdav.Handler{
		Prefix:     "/s/" + ctx.Share.Id,
		FileSystem: model.NewWebdavFs(ctx.Backend, ctx.Share.Backend, ctx.Share.Path, req),
		LockSystem: model.NewWebdavLock(),
	}
	h.ServeHTTP(res, req)
}

/*
 * OSX ask for a lot of crap while mounting as a network drive. To avoid wasting resources with such
 * an imbecile and considering we can't even see the source code they are running, the best approach we
 * could go on is: "crap in, crap out" where useless request coming in are identified and answer appropriatly
 */
func WebdavBlacklist(fn func(*App, http.ResponseWriter, *http.Request)) func(ctx *App, res http.ResponseWriter, req *http.Request) {
	return func(ctx *App, res http.ResponseWriter, req *http.Request) {
		base := filepath.Base(req.URL.String())

		if req.Method == "PUT" || req.Method == "MKCOL" {
			if strings.HasPrefix(base, "._") {
				res.WriteHeader(http.StatusMethodNotAllowed)
				res.Write([]byte(""))
				return
			} else if base == ".DS_Store" {
				res.WriteHeader(http.StatusMethodNotAllowed)
				res.Write([]byte(""))
				return
			} else if base == ".localized" {
				res.WriteHeader(http.StatusMethodNotAllowed)
				res.Write([]byte(""))
				return
			}
		} else if req.Method == "PROPFIND" {
			if strings.HasPrefix(base, "._") {
				res.WriteHeader(http.StatusForbidden)
				return
			} else if base == ".DS_Store" {
				res.WriteHeader(http.StatusForbidden)
				res.Write([]byte(""))
				return
			} else if base == ".localized" {
				res.WriteHeader(http.StatusForbidden)
				return
			} else if base == ".ql_disablethumbnails" {
				res.WriteHeader(http.StatusForbidden)
				res.Write([]byte(""))
				return
			} else if base == ".ql_disablecache" {
				res.WriteHeader(http.StatusForbidden)
				return
			} else if base == ".hidden" {
				res.WriteHeader(http.StatusForbidden)
				return
			} else if base == ".Spotlight-V100" {
				res.WriteHeader(http.StatusForbidden)
				return
			} else if base == ".metadata_never_index" {
				res.WriteHeader(http.StatusForbidden)
				return
			} else if base == "Contents" {
				res.WriteHeader(http.StatusForbidden)
				return
			} else if base == ".metadata_never_index_unless_rootfs" {
				res.WriteHeader(http.StatusForbidden)
				return
			}
		} else if req.Method == "GET" {
			if base == ".DS_Store" {
				res.WriteHeader(http.StatusForbidden)
				res.Write([]byte(""))
				return
			}
		} else if req.Method == "DELETE" {
			if base == ".DS_Store" {
				res.WriteHeader(http.StatusForbidden)
				res.Write([]byte(""))
				return
			}
		} else if req.Method == "LOCK" || req.Method == "UNLOCK" {
			if base == ".DS_Store" {
				res.WriteHeader(http.StatusMethodNotAllowed)
				res.Write([]byte(""))
				return
			}
		}
		fn(ctx, res, req)
	}
}
