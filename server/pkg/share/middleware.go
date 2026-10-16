package share

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	"github.com/mickael-kerjean/filestash/server/pkg/token"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/gorilla/mux"
)

func CanManageShare(sessionStart Middleware, extractSession func(*http.Request, *App) (map[string]string, error)) Middleware {
	return func(fn HandlerFunc) HandlerFunc {
		return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
			shareID := mux.Vars(req)["share"]
			if shareID == "" {
				Log.Debug("pkg::share::middleware reason=invalid+share+id")
				SendErrorResult(res, ErrNotValid)
				return
			}

			// unattributed share_id can be claimed by a logged in user (beside a shared links)
			s, err := ShareGet(shareID)
			if err != nil {
				if err == ErrNotFound {
					sessionStart(func(ctx *App, res http.ResponseWriter, req *http.Request) {
						if ctx.Share.Id != "" {
							SendErrorResult(res, ErrPermissionDenied)
							return
						}
						fn(ctx, res, req)
					})(ctx, res, req)
					return
				}
				Log.Debug("pkg::share::middleware reason=cannot+get+share err=%q", err.Error())
				SendErrorResult(res, err)
				return
			}

			// In a scenario where the shared link has already been attributed, we have 2 scenarios:
			// 1) scenario 1: the user is the very same one that generated the shared link in the first place
			ctx.Share = Share{}
			ctx.Authorization = token.From(req)
			if ctx.Session, err = extractSession(req, ctx); err != nil {
				Log.Debug("pkg::share::middleware reason=cannot+extract+session err=%q", err.Error())
				SendErrorResult(res, err)
				return
			}
			if s.Backend == GenerateID(ctx.Session) {
				fn(ctx, res, req)
				return
			}
			// 2) scenario 2: the user is different than the one that has generated the shared link
			SendErrorResult(res, ErrPermissionDenied)
		})
	}
}
