package admin

import (
	"io"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
)

func PrivateConfigHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	SendSuccessResult(res, &Config)
}

func PrivateConfigUpdateHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	b, _ := io.ReadAll(req.Body)
	if err := SaveConfig(b); err != nil {
		SendErrorResult(res, err)
		return
	}
	Config.Load()
	SendSuccessResult(res, nil)
}
