package remotedialer

import (
	"context"
	"net/http"
	"time"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/gorilla/websocket"
)

type ConnectAuthorizer func(proto, address string) bool

func ClientConnect(wsURL string, headers http.Header, dialer *websocket.Dialer, auth ConnectAuthorizer, onConnect func(context.Context) error) {
	if err := connectToProxy(wsURL, headers, auth, dialer, onConnect); err != nil {
		Log.Info("[tunnel] client_connect %s", err.Error())
		time.Sleep(time.Duration(1) * time.Second)
	}
}

func connectToProxy(proxyURL string, headers http.Header, auth ConnectAuthorizer, dialer *websocket.Dialer, onConnect func(context.Context) error) error {
	if dialer == nil {
		dialer = &websocket.Dialer{}
	}
	ws, res, err := dialer.Dial(proxyURL, headers)
	if err != nil {
		Log.Info("[tunnel] proxy_connect_failure %s", err.Error())
		b := make([]byte, 100)
		res.Body.Read(b)
		return err
	}
	defer ws.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if onConnect != nil {
		if err := onConnect(ctx); err != nil {
			return err
		}
	}

	session := NewClientSession(auth, ws)
	_, err = session.Serve()
	session.Close()
	return err
}
