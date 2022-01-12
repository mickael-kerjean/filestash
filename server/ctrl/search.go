package ctrl

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
	"net/http"
	"strings"
)

func FileSearch(ctx App, res http.ResponseWriter, req *http.Request) {
	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		path = "/"
	}
	q := req.URL.Query().Get("q")
	if model.CanRead(&ctx) == false {
		Log.Debug("ctrl::search 'can not read \"%s\"'", path)
		SendErrorResult(res, ErrPermissionDenied)
		return
	}

	var searchResults []IFile
	searchEngine := Hooks.Get.SearchEngine()
	if searchEngine == nil {
		SendErrorResult(res, ErrMissingDependency)
		return
	}
	searchResults, err = searchEngine.Query(ctx, path, q)
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	// overwrite the path of a file according to chroot
	if ctx.Session["path"] != "" {
		for i := 0; i < len(searchResults); i++ {
			searchResults[i] = File{
				FName: searchResults[i].Name(),
				FSize: searchResults[i].Size(),
				FType: func() string {
					if searchResults[i].IsDir() {
						return "directory"
					}
					return "file"
				}(),
				FPath: "/" + strings.TrimPrefix(
					searchResults[i].Path(),
					ctx.Session["path"],
				),
			}
		}
	}
	SendSuccessResults(res, searchResults)
}
