package common

import (
	"os"
	"path/filepath"
)

const (
	APP_VERSION       = "v0.5"
	LOG_PATH          = "data/state/log/"
	CONFIG_PATH       = "data/state/config/"
	DB_PATH           = "data/state/db/"
	FTS_PATH          = "data/state/search/"
	CERT_PATH         = "data/state/certs/"
	TMP_PATH          = "data/cache/tmp/"
	COOKIE_NAME_AUTH  = "auth"
	COOKIE_NAME_PROOF = "proof"
	COOKIE_NAME_ADMIN = "admin"
	COOKIE_PATH_ADMIN = "/admin/api/"
	COOKIE_PATH       = "/api/"
	FILE_INDEX        = "./data/public/index.html"
	FILE_ASSETS       = "./data/public/"
	URL_SETUP         = "/admin/setup"
)

func init() {
	os.MkdirAll(filepath.Join(GetCurrentDir(), LOG_PATH), os.ModePerm)
	os.MkdirAll(filepath.Join(GetCurrentDir(), FTS_PATH), os.ModePerm)
	os.MkdirAll(filepath.Join(GetCurrentDir(), CONFIG_PATH), os.ModePerm)
	os.RemoveAll(filepath.Join(GetCurrentDir(), TMP_PATH))
	os.MkdirAll(filepath.Join(GetCurrentDir(), TMP_PATH), os.ModePerm)
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
