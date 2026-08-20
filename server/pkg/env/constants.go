//go:generate go run generator.go
package env

import (
	"os"
	"path/filepath"
	"strings"
)

var (
	APP_VERSION = "v0.6"
	APPNAME     = "Filestash"
	BASE        = strings.TrimSuffix(os.Getenv("FILESTASH_BASE"), "/")
	LICENSE     = "agpl"

	CONFIG_PATH = fromPath("state/config/")
	CERT_PATH   = fromPath("state/certs/")
	PLUGIN_PATH = fromPath("state/plugins/")
	DB_PATH     = fromPath("state/db/")
	FTS_PATH    = fromPath("state/search/")
	LOG_PATH    = fromPath("state/log/")
	TMP_PATH    = fromPath("cache/")

	COOKIE_NAME_PROOF = "proof"
	COOKIE_NAME_ADMIN = "admin"
	COOKIE_PATH_ADMIN = WithBase("/admin/api/")
	COOKIE_PATH       = WithBase("/api/")
	URL_SETUP         = WithBase("/admin/setup")
)

var (
	SECRET_KEY                        string
	SECRET_KEY_DERIVATE_FOR_PROOF     string
	SECRET_KEY_DERIVATE_FOR_ADMIN     string
	SECRET_KEY_DERIVATE_FOR_USER      string
	SECRET_KEY_DERIVATE_FOR_HASH      string
	SECRET_KEY_DERIVATE_FOR_SIGNATURE string
)

func fromPath(p string) string {
	rootPath := "data/"
	if p := os.Getenv("FILESTASH_PATH"); p != "" {
		rootPath = p
	}
	return filepath.Join(rootPath, p)
}
