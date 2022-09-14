package ctrl

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"io/ioutil"
	"net/http"
	"path/filepath"
)

var configpath = filepath.Join(GetCurrentDir(), CONFIG_PATH, "config.json")

func PrivateConfigHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	SendSuccessResult(res, &Config)
}

func PrivateConfigUpdateHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	b, _ := ioutil.ReadAll(req.Body)
	if err := SaveConfig(b); err != nil {
		SendErrorResult(res, err)
		return
	}
	Config.Load()
	SendSuccessResult(res, nil)
}

func PublicConfigHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	cfg := Config.Export()
	SendSuccessResultWithEtagAndGzip(res, req, cfg)
}
