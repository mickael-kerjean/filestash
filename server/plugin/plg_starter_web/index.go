package plg_starter_web

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Starter(WebServer)
	// Hooks.Register.Hook() // letsencrypt hook
}
