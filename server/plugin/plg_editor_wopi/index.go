package plg_editor_wopi

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Onload(func() {
		server_url()
		origin()
		if plugin_enable() {
			Hooks.Register.XDGOpen(WOPIOverrides)
		}
	})
	Hooks.Register.HttpEndpoint(WOPIRoutes)
}
