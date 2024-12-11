package plg_editor_wopi

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.HttpEndpoint(WOPIRoutes)
	Hooks.Register.XDGOpen(WOPIOverrides)

	Hooks.Register.Onload(func() {
		plugin_enable()
		server_url()
	})
}
