package session

import (
	"net/http"
	"net/url"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/files"
	"github.com/mickael-kerjean/filestash/server/pkg/journal"

	"github.com/gorilla/mux"
)

func SessionOAuthBackend(ctx *App, res http.ResponseWriter, req *http.Request) {
	op := journal.PublishSession(ctx, req, "oauth")
	defer op.Close(res)
	vars := mux.Vars(req)
	a := map[string]string{
		"type": vars["service"],
	}
	b, err := files.NewBackend(ctx, a)
	if err != nil {
		Log.Debug("session::oauth 'NewBackend' %+v", err)
		SendErrorResult(res, err)
		return
	}
	obj, ok := b.(interface{ OAuthURL() string })
	if ok == false {
		Log.Debug("session::oauth 'Backend does not support oauth - \"%s\"'", a["type"])
		SendErrorResult(res, ErrNotSupported)
		return
	}
	redirectUrl, err := url.Parse(obj.OAuthURL())
	if err != nil {
		Log.Debug("session::oauth 'Parse URL - \"%s\"'", a["type"])
		SendErrorResult(res, ErrNotValid)
		return
	}
	stateValue := vars["service"]
	if req.URL.Query().Get("next") != "" {
		stateValue += "::" + req.URL.Query().Get("next")
	}
	q := redirectUrl.Query()
	q.Set("state", stateValue)
	redirectUrl.RawQuery = q.Encode()
	if strings.Contains(req.Header.Get("Accept"), "text/html") {
		http.Redirect(res, req, redirectUrl.String(), http.StatusSeeOther)
		return
	}
	SendSuccessResult(res, redirectUrl.String())
}
