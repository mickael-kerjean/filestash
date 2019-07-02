package plugin

import (
	_ "github.com/mickael-kerjean/filestash/src/plugin/plg_starter_tunnel"
	_ "github.com/mickael-kerjean/filestash/src/plugin/plg_starter_tor"
	_ "github.com/mickael-kerjean/filestash/src/plugin/plg_image_light"
	_ "github.com/mickael-kerjean/filestash/src/plugin/plg_backend_backblaze"
	_ "github.com/mickael-kerjean/filestash/src/plugin/plg_backend_dav"
	_ "github.com/mickael-kerjean/filestash/src/plugin/plg_backend_mysql"
	_ "github.com/mickael-kerjean/filestash/src/plugin/plg_backend_ftps"
	_ "github.com/mickael-kerjean/filestash/src/plugin/plg_security_scanner"
	_ "github.com/mickael-kerjean/filestash/src/plugin/plg_security_svg"
	_ "github.com/mickael-kerjean/filestash/src/plugin/plg_handler_console"
	. "github.com/mickael-kerjean/filestash/src/common"
)

func init() {
	Log.Debug("Plugin loader")
}
