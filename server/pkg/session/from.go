package session

import (
	"encoding/json"
	"net/http"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	"github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func FromRequest(req *http.Request, ctx *App) (map[string]string, error) {
	var (
		str     string
		err     error
		session map[string]string = make(map[string]string)
	)

	if ctx.Share.Id != "" {
		str, err = DecryptString(env.SECRET_KEY_DERIVATE_FOR_USER, ctx.Share.Auth)
		if err != nil {
			// This typically happen when changing the secret key
			Log.Debug("pkg::session::from action=token_decrypt source=share error=%s", err)
			return session, ErrNotAuthorized
		}
		if err = json.Unmarshal([]byte(str), &session); err != nil {
			Log.Debug("pkg::session::from action=token_unmarshal source=share error=%q", err)
		}
		session["path"] = ctx.Share.Path
		return session, err
	}

	if ctx.Authorization == "" {
		Log.Debug("pkg::session::from action=restore reason=missing_token")
		return session, nil
	}
	str, err = DecryptString(env.SECRET_KEY_DERIVATE_FOR_USER, ctx.Authorization)
	if err != nil {
		// This typically happen when changing the secret key
		Log.Debug("pkg::session::from action=token_decrypt source=token error=%q", err)
		return session, ErrNotAuthorized
	}
	if err = json.Unmarshal([]byte(str), &session); err != nil {
		Log.Debug("pkg::session::from action=token_unmarshal source=token error=%q", err)
		return session, err
	}
	t, err := time.Parse(time.RFC3339, session["timestamp"])
	if err != nil {
		Log.Warning("pkg::session::from action=parse_time err=%q", err.Error())
		return session, ErrNotAuthorized
	} else if t.Add(24 * 365 * time.Hour).Before(time.Now()) {
		Log.Warning("pkg::session::from action=cookie_old time=%q", t.Format(time.RFC3339))
		return session, ErrNotAuthorized
	}
	return session, err
}
