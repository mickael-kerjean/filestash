package session

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/journal"
	"github.com/mickael-kerjean/filestash/server/pkg/token"
)

func SessionLogout(ctx *App, res http.ResponseWriter, req *http.Request) {
	op := journal.PublishSession(ctx, req, "logout")
	defer op.Close(res)
	go func() {
		// user typically expect the logout to feel instant but in our case we still need to make sure
		// the connection is closed as lot of backend requires to hold an active session which we cache.
		// Whenever somebody logout after say 30 minutes idle, the logout would first create a connection
		// then close which can take a few seconds and make for a bad user experience.
		// By pushing that connection close in a goroutine, we make sure the logout is much faster for
		// the user while still retaining that functionality.
		Try(func(c *App, _res http.ResponseWriter, _req *http.Request) {
			if c.Backend != nil {
				if obj, ok := c.Backend.(interface{ Close() error }); ok {
					obj.Close()
				}
			}
		})(ctx, res, req)
	}()
	token.Clear(res, req)
	http.SetCookie(res, &http.Cookie{
		Name:   COOKIE_NAME_ADMIN,
		Value:  "",
		MaxAge: -1,
		Path:   COOKIE_PATH_ADMIN,
	})
	http.SetCookie(res, &http.Cookie{
		Name:   COOKIE_NAME_PROOF,
		Value:  "",
		MaxAge: -1,
		Path:   COOKIE_PATH,
	})
	Log.Stdout("AUDIT action[logout] backend[%s] user[%s] target[%s]", ctx.Session["type"], username(ctx.Session), ip(req))
	SendSuccessResult(res, nil)
}
