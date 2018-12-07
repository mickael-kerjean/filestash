package ctrl

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	. "github.com/mickael-kerjean/nuage/server/middleware"
	"github.com/mickael-kerjean/nuage/server/model"
	"github.com/mickael-kerjean/net/webdav"
	"github.com/mickael-kerjean/mux"
	"net/http"
	"path/filepath"
	"strings"
	"time"
)

var start time.Time = time.Now()

func WebdavHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	share_id := mux.Vars(req)["share"]
	prefix := "/s/" + share_id
	req.Header.Del("Content-Type")

	if req.Method == "GET" && req.URL.Path == prefix {
		DefaultHandler(FILE_INDEX, ctx).ServeHTTP(res, req)
		return
	}

	isCrap := func(p string) bool {
		if strings.HasPrefix(p, ".") {
			return true
		}
		return false
	}(filepath.Base(req.URL.Path))
	if isCrap == true {
		http.NotFound(res, req)
		return
	}

	var err error
	if ctx.Share, err = ExtractShare(req, &ctx, share_id); err != nil {
		http.NotFound(res, req)
		return
	}

	if ctx.Session, err = ExtractSession(req, &ctx); err != nil {
		http.NotFound(res, req)
		return
	}
	if ctx.Backend, err = ExtractBackend(req, &ctx); err != nil || ctx.Backend == nil {
		http.NotFound(res, req)
		return
	}
	if share_id == "" {
		http.NotFound(res, req)
		return
	}

	Log.Warning("==== REQUEST ('%s'): %s", req.Method, req.URL.Path)
	//start := time.Now()
	h := &webdav.Handler{
		Prefix: "/s/" + share_id,
		FileSystem: model.NewWebdavFs(ctx.Backend, ctx.Share.Path),
		LockSystem: webdav.NewMemLS(),
		Logger: func(r *http.Request, err error) {
			//Log.Info("==== REQUEST ('%s' => %d): %s\n", req.Method, time.Now().Sub(start) / (1000 * 1000), req.URL.Path)
			// e := func(err error) string{
			// 	if err != nil {
			// 		return err.Error()
			// 	}
			// 	return "OK"
			// }(err)
			//Log.Info("INFO %s WEBDAV %s %s %s", share_id, req.Method, req.URL.Path, e)
		},
	}
	h.ServeHTTP(res, req)
}
