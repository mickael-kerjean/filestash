package ctrl

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
	"net/http"
)

func FileSearch(ctx App, res http.ResponseWriter, req *http.Request) {
	if Config.Get("features.search.enable").Bool() == false {
		SendErrorResult(res, ErrNotAllowed)
		return
	}

	path, err := pathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		path = "/"
	}
	q := req.URL.Query().Get("q")
	if model.CanRead(&ctx) == false {
		SendErrorResult(res, ErrPermissionDenied)
		return
	}
	SendSuccessResults(res, model.Search(&ctx, path, q))
}
