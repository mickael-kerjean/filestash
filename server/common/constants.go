package common

const (
	APP_VERSION = "v0.4"
	CONFIG_PATH = "data/config/"
	PLUGIN_PATH = "data/plugin/"
	LOG_PATH    = "data/log/"
	TMP_PATH    = "data/tmp/"
	COOKIE_NAME_AUTH = "auth"
	COOKIE_NAME_PROOF = "proof"
	COOKIE_NAME_ADMIN = "admin"
	COOKIE_PATH_ADMIN = "/admin/api/"
	COOKIE_PATH = "/api/"
	FILE_INDEX = "./data/public/index.html"
	FILE_ASSETS = "./data/public/"
	URL_SETUP = "/admin/setup"
)

var (
	BUILD_NUMBER string
	SECRET_KEY   string
	SECRET_KEY_DERIVATE_FOR_PROOF string
	SECRET_KEY_DERIVATE_FOR_ADMIN string
	SECRET_KEY_DERIVATE_FOR_USER  string
)


/*
 * Improve security by calculating derivative of the secret key to restrict the attack surface
 * in the worst case scenario with one compromise secret key
 */
func InitSecretDerivate(secret string) {
	SECRET_KEY = secret
	SECRET_KEY_DERIVATE_FOR_PROOF = Hash("PROOF_" + SECRET_KEY, len(SECRET_KEY))
	SECRET_KEY_DERIVATE_FOR_ADMIN = Hash("ADMIN_" + SECRET_KEY, len(SECRET_KEY))
	SECRET_KEY_DERIVATE_FOR_USER = Hash("USER_" + SECRET_KEY, len(SECRET_KEY))
}
