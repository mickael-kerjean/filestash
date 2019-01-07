package ctrl

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
	"github.com/mickael-kerjean/net/webdav"
	"net/http"
)

func WebdavHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	if ctx.Share.Id == "" {
		http.NotFound(res, req)
		return
	}

	return
	h := &webdav.Handler{
		Prefix: "/s/" + ctx.Share.Id,
		FileSystem: model.NewWebdavFs(ctx.Backend, ctx.Share.Path),
		LockSystem: webdav.NewMemLS(),
	}
	h.ServeHTTP(res, req)
}
