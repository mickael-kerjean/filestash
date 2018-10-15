package ctrl

import (
	"net/http"
	"log"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/model"
	"golang.org/x/net/webdav"
	"github.com/mickael-kerjean/mux"
	"strings"
)

func WebdavHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	accept := req.Header.Get("Accept")
	if strings.HasPrefix(accept, "text/html") {
		DefaultHandler("./data/public/index.html", ctx).ServeHTTP(res, req)
		return
	}
	if ctx.Backend == nil {
		http.NotFound(res, req)
		return
	}

	s := model.Share{ Id: mux.Vars(req)["id"] }
	log.Println("> webdav: "+ s.Id)	

	h := &webdav.Handler{
		Prefix: "/s/",// + s.Id,
		FileSystem: model.NewWebdavFs(ctx.Backend),
		LockSystem: webdav.NewMemLS(),
		Logger: func(r *http.Request, err error) {
			Log(&ctx, "Webdav", "INFO")
		},
	}
	h.ServeHTTP(res, req)
}
