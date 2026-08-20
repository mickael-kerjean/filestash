package share

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/mickael-kerjean/filestash/server/pkg/token"

	"github.com/gorilla/mux"
)

func CanManageShare(sessionStart Middleware, extractSession func(*http.Request, *App) (map[string]string, error)) Middleware {
	return func(fn HandlerFunc) HandlerFunc {
		return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
			share_id := mux.Vars(req)["share"]
			if share_id == "" {
				Log.Debug("share::middleware 'invalid share id'")
				SendErrorResult(res, ErrNotValid)
				return
			}

			// anyone can manage a share_id that's not been attributed yet
			s, err := Get(share_id)
			if err != nil {
				if err == ErrNotFound {
					sessionStart(fn)(ctx, res, req)
					return
				}
				Log.Debug("share::middleware 'cannot get share - %s'", err.Error())
				SendErrorResult(res, err)
				return
			}

			// In a scenario where the shared link has already been atributed, we need to make sure
			// the user that's currently logged in can manage the link. 2 scenarios here:
			// 1) scenario 1: the user is the very same one that generated the shared link in the first place
			ctx.Share = Share{}
			ctx.Authorization = token.Extract(req)
			if ctx.Session, err = extractSession(req, ctx); err != nil {
				Log.Debug("share::middleware 'cannot extract session - %s'", err.Error())
				SendErrorResult(res, err)
				return
			}
			if s.Backend == GenerateID(ctx.Session) {
				fn(ctx, res, req)
				return
			}
			// 2) scenario 2: the user is different than the one that has generated the shared link
			// in this scenario, the link owner might have granted for user the right to reshare links
			if ctx.Share, err = FromRequest(req); err != nil {
				Log.Debug("share::middleware 'cannot extract share - %s'", err.Error())
				SendErrorResult(res, err)
				return
			}
			ctx.Authorization = token.Extract(req)
			if ctx.Session, err = extractSession(req, ctx); err != nil {
				Log.Debug("share::middleware 'cannot extract session 2 - %s'", err.Error())
				SendErrorResult(res, err)
				return
			}

			id := GenerateID(ctx.Session)
			if s.Backend == id {
				if s.CanShare == true {
					fn(ctx, res, req)
					return
				}
				Log.Debug("share::middleware 'permission denied - s.CanShare[%+v] s.Backend[%s]'", s.CanShare, s.Backend)
			} else {
				Log.Debug("share::middleware 'permission denied - s.CanShare[%+v] s.Backend[%s] GenerateID[%s]'", s.CanShare, s.Backend, id)
			}
			SendErrorResult(res, ErrPermissionDenied)
			return
		})
	}
}
