package plg_handler_mcp

import (
	"net/http"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/plugin/plg_handler_mcp/types"
)

func (this *Server) RemoveSession(userSession *UserSession) {
	this.sessions.Delete(userSession.Id)
}

func ExtractToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if hasToken := strings.HasPrefix(authHeader, "Bearer "); hasToken == false {
		return ""
	}
	return strings.TrimPrefix(authHeader, "Bearer ")
}

func (this *Server) GetSession(uuid string) UserSession {
	ch, _ := this.sessions.LoadOrStore(uuid, UserSession{
		Id:      uuid,
		Chan:    make(chan JSONRPCRequest),
		CurrDir: "/",
		HomeDir: "/",
		Ping: Ping{
			ID:           0,
			LastResponse: time.Now(),
		},
	})
	return ch.(UserSession)
}
