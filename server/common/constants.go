package common

import (
	"os"
	"path/filepath"
)

//go:generate go run ../generator/constants.go
const (
	APP_VERSION       = "v0.5"
	COOKIE_NAME_AUTH  = "auth"
	COOKIE_NAME_PROOF = "proof"
	COOKIE_NAME_ADMIN = "admin"
	COOKIE_PATH_ADMIN = "/admin/api/"
	COOKIE_PATH       = "/api/"
	URL_SETUP         = "/admin/setup"
)

var (
	CONFIG_PATH = "state/config/"
	CERT_PATH   = "state/certs/"
	DB_PATH     = "state/db/"
	FTS_PATH    = "state/search/"
	LOG_PATH    = "state/log/"
	TMP_PATH    = "cache/"
)

func init() {
	// STEP1: setup app path
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

	// STEP2: initialise the config
	os.MkdirAll(GetAbsolutePath(CERT_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(DB_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(FTS_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(LOG_PATH), os.ModePerm)
	os.RemoveAll(GetAbsolutePath(TMP_PATH))
	os.MkdirAll(GetAbsolutePath(TMP_PATH), os.ModePerm)
}

var (
	BUILD_REF                     string
	BUILD_DATE                    string
	LICENSE                       string = "agpl"
	SECRET_KEY                    string
	SECRET_KEY_DERIVATE_FOR_PROOF string
	SECRET_KEY_DERIVATE_FOR_ADMIN string
	SECRET_KEY_DERIVATE_FOR_USER  string
	SECRET_KEY_DERIVATE_FOR_HASH  string
)

/*
 * Improve security by calculating derivative of the secret key to restrict the attack surface
 * in the worst case scenario with one compromise secret key
 */
func InitSecretDerivate(secret string) {
	SECRET_KEY = secret
	SECRET_KEY_DERIVATE_FOR_PROOF = Hash("PROOF_"+SECRET_KEY, len(SECRET_KEY))
	SECRET_KEY_DERIVATE_FOR_ADMIN = Hash("ADMIN_"+SECRET_KEY, len(SECRET_KEY))
	SECRET_KEY_DERIVATE_FOR_USER = Hash("USER_"+SECRET_KEY, len(SECRET_KEY))
	SECRET_KEY_DERIVATE_FOR_HASH = Hash("HASH_"+SECRET_KEY, len(SECRET_KEY))
}
