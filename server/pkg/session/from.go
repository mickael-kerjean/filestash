package session

import (
	"net/http"
	"time"
	"encoding/json"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func FromRequest(req *http.Request, ctx *App) (map[string]string, error) {
	var (
		str     string
		err     error
		session map[string]string = make(map[string]string)
	)

	if ctx.Share.Id != "" {
		str, err = DecryptString(SECRET_KEY_DERIVATE_FOR_USER, ctx.Share.Auth)
		if err != nil {
			// This typically happen when changing the secret key
			return session, ErrNotAuthorized
		}
		err = json.Unmarshal([]byte(str), &session)
		session["path"] = ctx.Share.Path
		return session, err
	}

	if ctx.Authorization == "" {
		return session, nil
	}
	str, err = DecryptString(SECRET_KEY_DERIVATE_FOR_USER, ctx.Authorization)
	if err != nil {
		// This typically happen when changing the secret key
		Log.Debug("middleware::session decrypt error '%s'", err.Error())
		return session, ErrNotAuthorized
	}
	if err = json.Unmarshal([]byte(str), &session); err != nil {
		return session, err
	}
	t, err := time.Parse(time.RFC3339, session["timestamp"])
	if err != nil {
		Log.Warning("middleware::session 'cannot parse time - %s'", err.Error())
		return session, ErrNotAuthorized
	} else if t.Add(24 * 365 * time.Hour).Before(time.Now()) {
		Log.Warning("middleware::session 'cookie too old - %s'", t.Format(time.RFC3339))
		return session, ErrNotAuthorized
	}
	return session, err
}
