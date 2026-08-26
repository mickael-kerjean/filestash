package common

import (
	_ "unsafe"

	"github.com/mickael-kerjean/filestash/server/pkg/env"
)

//go:linkname APPNAME github.com/mickael-kerjean/filestash/server/pkg/env.APPNAME
//go:linkname LICENSE github.com/mickael-kerjean/filestash/server/pkg/env.LICENSE

var (
	APP_VERSION       = env.APP_VERSION
	BUILD_REF         = env.BUILD_REF
	BUILD_DATE        = env.BUILD_DATE
	APPNAME           = env.APPNAME
	LICENSE           = env.LICENSE
	BASE              = env.BASE
	URL_SETUP         = env.URL_SETUP
	CONFIG_PATH       = env.CONFIG_PATH
	CERT_PATH         = env.CERT_PATH
	PLUGIN_PATH       = env.PLUGIN_PATH
	DB_PATH           = env.DB_PATH
	FTS_PATH          = env.FTS_PATH
	LOG_PATH          = env.LOG_PATH
	TMP_PATH          = env.TMP_PATH
	COOKIE_NAME_PROOF = env.COOKIE_NAME_PROOF
	COOKIE_NAME_ADMIN = env.COOKIE_NAME_ADMIN
	COOKIE_PATH_ADMIN = env.COOKIE_PATH_ADMIN
	COOKIE_PATH       = env.COOKIE_PATH
)
