package system

import (
	"fmt"

	"github.com/mickael-kerjean/filestash/server/pkg/env"
)

var USER_AGENT = fmt.Sprintf("Filestash/%s.%s (http://filestash.app)", env.APP_VERSION, env.BUILD_DATE)

func init() {
	if env.IsWhiteLabel() {
		USER_AGENT = env.APPNAME
	}
}
