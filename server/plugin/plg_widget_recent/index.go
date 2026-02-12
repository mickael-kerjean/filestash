package plg_widget_recent

import (
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Middleware(func(next HandlerFunc) HandlerFunc {
		return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
			if ctx.Share.Id != "" {
				next(ctx, res, req)
				return
			}
			recentPathAdd := ""
			recentPathRemove := ""
			if strings.HasSuffix(req.URL.Path, "/api/files/ls") && req.Method == http.MethodGet  {
				if path := req.URL.Query().Get("path"); path == "/Recent/" {
					files, err := GetRecent(GenerateID(ctx.Session), getUser(ctx.Session))
					if err != nil {
						SendErrorResult(res, err)
						return
					}
					SendSuccessResultsWithMetadata(res, files, Metadata{
						CanCreateFile: NewBool(false),
						CanCreateDirectory: NewBool(false),
						CanRename:     NewBool(false),
						CanMove:       NewBool(false),
						CanUpload:     NewBool(false),
						CanDelete: NewBool(false),
					})
					return
				}
				recentPathAdd = EnforceDirectory(req.URL.Query().Get("path"))
			}
			if strings.HasSuffix(req.URL.Path, "/api/files/cat") && (req.Method == http.MethodGet || req.Method == http.MethodPost) {
				recentPathAdd = req.URL.Query().Get("path")
			}
			if strings.HasSuffix(req.URL.Path, "/api/files/save") && (req.Method == http.MethodPost) {
				recentPathAdd = req.URL.Query().Get("path")
			}
			if strings.HasSuffix(req.URL.Path, "/api/files/rm") && req.Method == http.MethodPost  {
				recentPathRemove = req.URL.Query().Get("path")
			}
			if strings.HasSuffix(req.URL.Path, "/api/files/mkdir") && req.Method == http.MethodPost  {
				recentPathAdd = EnforceDirectory(req.URL.Query().Get("path"))
			}
			if strings.HasSuffix(req.URL.Path, "/api/files/mv") && req.Method == http.MethodPost  {
				recentPathRemove = req.URL.Query().Get("from")
				recentPathAdd = req.URL.Query().Get("to")
			}

			if recentPathAdd != "" {
				var size int64 = 0
				if b, err := ctx.Backend.Init(ctx.Session, ctx); err == nil {
					if finfo, err := b.Stat(recentPathAdd); err == nil {
						size = finfo.Size()
					}
				}
				go StoreRecent(
					GenerateID(ctx.Session),
					getUser(ctx.Session),
					recentPathAdd,
					size,
				)
			}
			if recentPathRemove != "" {
				go RemoveRecent(
					GenerateID(ctx.Session),
					getUser(ctx.Session),
					recentPathRemove,
				)
			}
			next(ctx, res, req)
		})
	})
}

func getUser(session map[string]string) string {
	if session["user"] != "" {
		return session["user"]
	}
	return "unknown"
}
