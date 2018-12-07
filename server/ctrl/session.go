package ctrl

import (
	"encoding/json"
	"github.com/mickael-kerjean/mux"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/model"
	"net/http"
	"time"
)

type Session struct {
	Home *string `json:"home,omitempty"`
	IsAuth bool  `json:"is_authenticated"`
}

func SessionGet(ctx App, res http.ResponseWriter, req *http.Request) {
	r := Session {
		IsAuth: false,
	}

	if ctx.Backend == nil {
		SendSuccessResult(res, r)
		return
	}
	home, err := model.GetHome(ctx.Backend, ctx.Session["path"])
	if err != nil {
		SendSuccessResult(res, r)
		return
	}
	r.IsAuth = true
	r.Home = NewString(home)
	SendSuccessResult(res, r)
}

func SessionAuthenticate(ctx App, res http.ResponseWriter, req *http.Request) {
	ctx.Body["timestamp"] = time.Now().String()
	session := model.MapStringInterfaceToMapStringString(ctx.Body)

	backend, err := model.NewBackend(&ctx, session)
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	if obj, ok := backend.(interface {
		OAuthToken(*map[string]string) error
	}); ok {
		err := obj.OAuthToken(&session)
		if err != nil {
			SendErrorResult(res, NewError("Can't authenticate (OAuth error)", 401))
			return
		}
		backend, err = model.NewBackend(&ctx, session)
		if err != nil {
			SendErrorResult(res, NewError("Can't authenticate", 401))
			return
		}
	}

	home, err := model.GetHome(backend, ctx.Session["path"])
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	s, err := json.Marshal(session);
	if err != nil {
		SendErrorResult(res, NewError(err.Error(), 500))
		return
	}
	obfuscate, err := EncryptString(SECRET_KEY, string(s))
	if err != nil {
		SendErrorResult(res, NewError(err.Error(), 500))
		return
	}
	cookie := http.Cookie{
		Name:     COOKIE_NAME_AUTH,
		Value:    obfuscate,
		MaxAge:   60 * 60 * 24 * 30,
		Path:     COOKIE_PATH,
		HttpOnly: true,
	}
	http.SetCookie(res, &cookie)

	if home == "" {
		SendSuccessResult(res, nil)
	} else if ctx.Body["path"] != nil {
		SendSuccessResult(res, nil)
	} else {
		SendSuccessResult(res, home)
	}
}

func SessionLogout(ctx App, res http.ResponseWriter, req *http.Request) {
	if ctx.Backend != nil {
		if obj, ok := ctx.Backend.(interface{ Close() error }); ok {
			go obj.Close()
		}
	}
	http.SetCookie(res, &http.Cookie{
		Name:   COOKIE_NAME_AUTH,
		Value:  "",
		Path:   COOKIE_PATH,
		MaxAge: -1,
	})
	http.SetCookie(res, &http.Cookie{
		Name:   COOKIE_NAME_ADMIN,
		Value:  "",
		Path:   COOKIE_PATH_ADMIN,
		MaxAge: -1,
	})
	SendSuccessResult(res, nil)
}

func SessionOAuthBackend(ctx App, res http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	a := map[string]string{
		"type": vars["service"],
	}
	b, err := model.NewBackend(&ctx, a)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	obj, ok := b.(interface{ OAuthURL() string })
	if ok == false {
		SendErrorResult(res, NewError("No backend authentication ("+b.Info()+")", 500))
		return
	}
	SendSuccessResult(res, obj.OAuthURL())
}
