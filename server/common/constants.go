package common

import (
	"os"
	_ "unsafe"

	"github.com/mickael-kerjean/filestash/server/pkg/env"
)

//go:linkname APP_VERSION github.com/mickael-kerjean/filestash/server/pkg/env.APP_VERSION
var APP_VERSION string

//go:linkname COOKIE_NAME_PROOF github.com/mickael-kerjean/filestash/server/pkg/env.COOKIE_NAME_PROOF
var COOKIE_NAME_PROOF string

//go:linkname COOKIE_NAME_ADMIN github.com/mickael-kerjean/filestash/server/pkg/env.COOKIE_NAME_ADMIN
var COOKIE_NAME_ADMIN string

//go:linkname COOKIE_PATH_ADMIN github.com/mickael-kerjean/filestash/server/pkg/env.COOKIE_PATH_ADMIN
var COOKIE_PATH_ADMIN string

//go:linkname COOKIE_PATH github.com/mickael-kerjean/filestash/server/pkg/env.COOKIE_PATH
var COOKIE_PATH string

//go:linkname URL_SETUP github.com/mickael-kerjean/filestash/server/pkg/env.URL_SETUP
var URL_SETUP string

//go:linkname CONFIG_PATH github.com/mickael-kerjean/filestash/server/pkg/env.CONFIG_PATH
var CONFIG_PATH string

//go:linkname CERT_PATH github.com/mickael-kerjean/filestash/server/pkg/env.CERT_PATH
var CERT_PATH string

//go:linkname PLUGIN_PATH github.com/mickael-kerjean/filestash/server/pkg/env.PLUGIN_PATH
var PLUGIN_PATH string

//go:linkname DB_PATH github.com/mickael-kerjean/filestash/server/pkg/env.DB_PATH
var DB_PATH string

//go:linkname FTS_PATH github.com/mickael-kerjean/filestash/server/pkg/env.FTS_PATH
var FTS_PATH string

//go:linkname LOG_PATH github.com/mickael-kerjean/filestash/server/pkg/env.LOG_PATH
var LOG_PATH string

//go:linkname TMP_PATH github.com/mickael-kerjean/filestash/server/pkg/env.TMP_PATH
var TMP_PATH string

//go:linkname APPNAME github.com/mickael-kerjean/filestash/server/pkg/env.APPNAME
var APPNAME string

//go:linkname BASE github.com/mickael-kerjean/filestash/server/pkg/env.BASE
var BASE string

//go:linkname BUILD_REF github.com/mickael-kerjean/filestash/server/pkg/env.BUILD_REF
var BUILD_REF string

//go:linkname BUILD_DATE github.com/mickael-kerjean/filestash/server/pkg/env.BUILD_DATE
var BUILD_DATE string

//go:linkname LICENSE github.com/mickael-kerjean/filestash/server/pkg/env.LICENSE
var LICENSE string

//go:linkname SECRET_KEY github.com/mickael-kerjean/filestash/server/pkg/env.SECRET_KEY
var SECRET_KEY string

//go:linkname SECRET_KEY_DERIVATE_FOR_PROOF github.com/mickael-kerjean/filestash/server/pkg/env.SECRET_KEY_DERIVATE_FOR_PROOF
var SECRET_KEY_DERIVATE_FOR_PROOF string

//go:linkname SECRET_KEY_DERIVATE_FOR_ADMIN github.com/mickael-kerjean/filestash/server/pkg/env.SECRET_KEY_DERIVATE_FOR_ADMIN
var SECRET_KEY_DERIVATE_FOR_ADMIN string

//go:linkname SECRET_KEY_DERIVATE_FOR_USER github.com/mickael-kerjean/filestash/server/pkg/env.SECRET_KEY_DERIVATE_FOR_USER
var SECRET_KEY_DERIVATE_FOR_USER string

//go:linkname SECRET_KEY_DERIVATE_FOR_HASH github.com/mickael-kerjean/filestash/server/pkg/env.SECRET_KEY_DERIVATE_FOR_HASH
var SECRET_KEY_DERIVATE_FOR_HASH string

//go:linkname SECRET_KEY_DERIVATE_FOR_SIGNATURE github.com/mickael-kerjean/filestash/server/pkg/env.SECRET_KEY_DERIVATE_FOR_SIGNATURE
var SECRET_KEY_DERIVATE_FOR_SIGNATURE string

var (
	WithBase       = env.WithBase
	TrimBase       = env.TrimBase
	IsWhiteLabel   = env.IsWhiteLabel
	WhiteLabelText = env.WhiteLabelText
)

func init() {
	os.MkdirAll(GetAbsolutePath(CERT_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(DB_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(FTS_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(LOG_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(PLUGIN_PATH), os.ModePerm)
	os.RemoveAll(GetAbsolutePath(TMP_PATH))
	os.MkdirAll(GetAbsolutePath(TMP_PATH), os.ModePerm)
}
