package plugin

import (
	_ "github.com/mickael-kerjean/filestash/server/plugin/plg_starter_http"
	_ "github.com/mickael-kerjean/filestash/server/plugin/plg_starter_tor"
	_ "github.com/mickael-kerjean/filestash/server/plugin/plg_image_light"
	_ "github.com/mickael-kerjean/filestash/server/plugin/plg_backend_backblaze"
	_ "github.com/mickael-kerjean/filestash/server/plugin/plg_backend_dav"
	_ "github.com/mickael-kerjean/filestash/server/plugin/plg_backend_mysql"
	_ "github.com/mickael-kerjean/filestash/server/plugin/plg_security_scanner"
	_ "github.com/mickael-kerjean/filestash/server/plugin/plg_security_svg"
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Log.Debug("Plugin loader")
}
