package session

import (
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/share"
	"github.com/mickael-kerjean/filestash/server/pkg/token"
)

func LoggedInOnly(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		if ctx.Backend == nil || ctx.Session == nil {
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		fn(ctx, res, req)
	})
}

func Start(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		var err error
		if ctx.Share, err = share.FromRequest(req); err != nil {
			SendErrorResult(res, err)
			return
		}
		ctx.Authorization = token.From(req)
		if ctx.Session, err = FromRequest(req, ctx); err != nil {
			share.RecoverFromBadCookie(res)
			SendErrorResult(res, err)
			return
		}
		if ctx.Backend, err = _extractBackend(req, ctx); err != nil {
			if len(ctx.Session) == 0 {
				SendErrorResult(res, ErrNotAuthorized)
				return
			}
			SendErrorResult(res, err)
			return
		}
		ctx.Languages = _extractLanguages(req)

		fn(ctx, res, req)
	})
}

func Try(fn HandlerFunc) HandlerFunc {
	return HandlerFunc(func(ctx *App, res http.ResponseWriter, req *http.Request) {
		ctx.Share, _ = share.FromRequest(req)
		ctx.Authorization = token.From(req)
		ctx.Session, _ = FromRequest(req, ctx)
		ctx.Backend, _ = _extractBackend(req, ctx)

		fn(ctx, res, req)
	})
}

func _extractBackend(req *http.Request, ctx *App) (IBackend, error) {
	return model.NewBackend(ctx, ctx.Session)
}

func _extractLanguages(req *http.Request) []string {
	var lng = []string{}
	for _, lngs := range strings.Split(req.Header.Get("Accept-Language"), ",") {
		chunks := strings.Split(lngs, ";")
		if len(chunks) == 0 {
			continue
		}
		lng = append(lng, chunks[0])
	}
	return lng
}
