package session

import (
	"encoding/json"
	"net/http"
	"slices"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/files"
	"github.com/mickael-kerjean/filestash/server/pkg/journal"
	"github.com/mickael-kerjean/filestash/server/pkg/token"
)

func SessionAuthenticate(ctx *App, res http.ResponseWriter, req *http.Request) {
	op := journal.PublishSession(ctx, req, "auth")
	defer op.Close(res)
	ctx.Body["timestamp"] = time.Now().Format(time.RFC3339)
	session := MapStringInterfaceToMapStringString(ctx.Body)
	session["path"] = EnforceDirectory(session["path"])
	if !isDirectAuthAllowed(session) {
		Log.Stdout("AUDIT action[fail] backend[%s] user[%s] target[%s]", session["type"], username(session), ip(req))
		SendErrorResult(res, ErrNotAllowed)
		return
	}

	backend, err := files.NewBackend(ctx, session)
	if err != nil {
		Log.Debug("[auth] action=authenticate::newBackend err=%s", ferror(err))
		Log.Stdout("AUDIT action[fail] backend[%s] user[%s] target[%s]", session["type"], backendID(session), ip(req))
		SendErrorResult(res, err)
		return
	}

	if obj, ok := backend.(interface {
		OAuthToken(*map[string]interface{}) error
	}); ok {
		if err := obj.OAuthToken(&ctx.Body); err != nil {
			Log.Debug("[auth] action=authenticate::oauthtoken err=%s", ferror(err))
			SendErrorResult(res, NewError("Can't authenticate (OAuth error)", 401))
			return
		}
		session = MapStringInterfaceToMapStringString(ctx.Body)
		session["path"] = EnforceDirectory(session["path"])
		backend, err = files.NewBackend(ctx, session)
		if err != nil {
			Log.Debug("[auth] action=authenticate::oauth::newBackend err=%s", ferror(err))
			Log.Stdout("AUDIT action[fail] backend[%s] user[%s] target[%s]", session["type"], username(session), ip(req))
			SendErrorResult(res, NewError("Can't authenticate", 401))
			return
		}
	}

	home, err := files.GetHome(backend, session["path"])
	if err != nil {
		Log.Debug("[auth] action=authenticate::getHome err=%s", ferror(err))
		SendErrorResult(res, ErrAuthenticationFailed)
		return
	}

	s, err := json.Marshal(session)
	if err != nil {
		Log.Debug("[auth] action=authenticate::marshall err=%s", ferror(err))
		SendErrorResult(res, NewError(err.Error(), 500))
		return
	}
	obfuscate, err := EncryptString(SECRET_KEY_DERIVATE_FOR_USER, string(s))
	if err != nil {
		Log.Debug("[auth] action=authenticate::encrypt err=%s", ferror(err))
		SendErrorResult(res, NewError(err.Error(), 500))
		return
	}
	token.Inject(res, req, obfuscate)
	if Config.Get("features.protection.iframe").String() != "" {
		res.Header().Set("Bearer", obfuscate)
	}
	Log.Stdout("AUDIT action[login] backend[%s] user[%s] target[%s]", session["type"], username(session), ip(req))
	SendSuccessResult(res, Session{
		IsAuth:        true,
		Home:          NewString(home),
		Backend:       backendID(session),
		Authorization: obfuscate,
	})
}

func isDirectAuthAllowed(session map[string]string) bool {
	return slices.ContainsFunc(Config.Connections(), func(conn map[string]any) bool {
		var (
			isSameType              = conn["type"] == session["type"]
			isBoundToAuthMiddleware = func() bool {
				if Config.Get("middleware.identity_provider.type").String() == "" {
					return false
				}
				label := NewStringFromInterface(conn["label"])
				for _, boundLabel := range strings.Split(Config.Get("middleware.attribute_mapping.related_backend").String(), ",") {
					if strings.TrimSpace(boundLabel) == label {
						return true
					}
				}
				return false
			}()
			isMatchingPinnedFields = func() bool {
				for _, field := range Backend.Get(session["type"]).LoginForm().Elmnts {
					if pin, isPinned := conn[field.Name]; isPinned {
						if field.Name == "path" {
							if pin == nil {
								pin = "/"
							}
							if configPath, ok := pin.(string); !ok || !strings.HasPrefix(session["path"], configPath) {
								return false
							}
						} else if NewStringFromInterface(pin) != session[field.Name] {
							return false
						}
					}
				}
				return true
			}()
		)
		return isSameType && isBoundToAuthMiddleware == false && isMatchingPinnedFields
	})
}
