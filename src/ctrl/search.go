package ctrl

import (
	. "github.com/mickael-kerjean/filestash/src/common"
	"github.com/mickael-kerjean/filestash/src/model"
	"net/http"
	"strings"
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
	searchResults := model.Search(&ctx, path, q)
	for i:=0; i<len(searchResults); i++ {
		if ctx.Session["path"] != "" {
			searchResults[i].FPath = "/" + strings.TrimPrefix(searchResults[i].FPath, ctx.Session["path"])
		}
	}
	SendSuccessResults(res, searchResults)
}
