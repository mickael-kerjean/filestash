package env

import (
	"os"
	"path/filepath"
	"strings"
)

//go:generate go run ../../generator/constants.go
var (
	APP_VERSION string = "v0.6"
	APPNAME     string = "Filestash"
	BASE        string
	BUILD_REF   string
	BUILD_DATE  string
	LICENSE     string = "agpl"
)

var (
	SECRET_KEY                        string
	SECRET_KEY_DERIVATE_FOR_PROOF     string
	SECRET_KEY_DERIVATE_FOR_ADMIN     string
	SECRET_KEY_DERIVATE_FOR_USER      string
	SECRET_KEY_DERIVATE_FOR_HASH      string
	SECRET_KEY_DERIVATE_FOR_SIGNATURE string
)

var (
	CONFIG_PATH = "state/config/"
	CERT_PATH   = "state/certs/"
	PLUGIN_PATH = "state/plugins/"
	DB_PATH     = "state/db/"
	FTS_PATH    = "state/search/"
	LOG_PATH    = "state/log/"
	TMP_PATH    = "cache/"
)

var (
	COOKIE_NAME_PROOF = "proof"
	COOKIE_NAME_ADMIN = "admin"
	COOKIE_PATH_ADMIN = "/admin/api/"
	COOKIE_PATH       = "/api/"
	URL_SETUP         = "/admin/setup"
)

func init() {
	// STEP1: setup app
	rootPath := "data/"
	if p := os.Getenv("FILESTASH_PATH"); p != "" {
		rootPath = p
	}
	LOG_PATH = filepath.Join(rootPath, LOG_PATH)
	CONFIG_PATH = filepath.Join(rootPath, CONFIG_PATH)
	DB_PATH = filepath.Join(rootPath, DB_PATH)
	FTS_PATH = filepath.Join(rootPath, FTS_PATH)
	CERT_PATH = filepath.Join(rootPath, CERT_PATH)
	TMP_PATH = filepath.Join(rootPath, TMP_PATH)
	PLUGIN_PATH = filepath.Join(rootPath, PLUGIN_PATH)
	BASE = strings.TrimSuffix(os.Getenv("FILESTASH_BASE"), "/")
	COOKIE_PATH_ADMIN = WithBase(COOKIE_PATH_ADMIN)
	COOKIE_PATH = WithBase(COOKIE_PATH)
	URL_SETUP = WithBase(URL_SETUP)
}
