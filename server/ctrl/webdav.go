package ctrl

import (
	"net/http"
	. "github.com/mickael-kerjean/nuage/server/common"
	. "github.com/mickael-kerjean/nuage/server/middleware"
	"github.com/mickael-kerjean/nuage/server/model"
	"github.com/mickael-kerjean/net/webdav"
	"github.com/mickael-kerjean/mux"
	"time"
)

var start time.Time = time.Now()

func WebdavHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	share_id := mux.Vars(req)["share"]
	prefix := "/s/" + share_id
	req.Header.Del("Content-Type")

	if req.Method == "GET" {
		if req.URL.Path == prefix {
			DefaultHandler(FILE_INDEX, ctx).ServeHTTP(res, req)
			return
		}
	}

	var err error
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

	// webdav is WIP
	http.NotFound(res, req)
	return

	h := &webdav.Handler{
		Prefix: "/s/" + share_id,
		FileSystem: model.NewWebdavFs(ctx.Backend, ctx.Session["path"]),
		LockSystem: webdav.NewMemLS(),
		Logger: func(r *http.Request, err error) {
			e := func(err error) string{
				if err != nil {
					return err.Error()
				}
				return "OK"
			}(err)
			Log.Info("INFO %s WEBDAV %s %s %s", share_id, req.Method, req.URL.Path, e)
		},
	}
	h.ServeHTTP(res, req)
}
