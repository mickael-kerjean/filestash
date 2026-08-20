package config

import (
	"os"

	"github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func InitSecretDerivate(secret string) {
	env.SECRET_KEY = secret
	env.SECRET_KEY_DERIVATE_FOR_PROOF = Hash("PROOF_"+env.SECRET_KEY, len(env.SECRET_KEY))
	env.SECRET_KEY_DERIVATE_FOR_ADMIN = Hash("ADMIN_"+env.SECRET_KEY, len(env.SECRET_KEY))
	env.SECRET_KEY_DERIVATE_FOR_USER = Hash("USER_"+env.SECRET_KEY, len(env.SECRET_KEY))
	env.SECRET_KEY_DERIVATE_FOR_HASH = Hash("HASH_"+env.SECRET_KEY, len(env.SECRET_KEY))
	env.SECRET_KEY_DERIVATE_FOR_SIGNATURE = Hash("SGN_"+env.SECRET_KEY, len(env.SECRET_KEY))
}

func init() {
	os.MkdirAll(GetAbsolutePath(env.CERT_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(env.DB_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(env.FTS_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(env.LOG_PATH), os.ModePerm)
	os.MkdirAll(GetAbsolutePath(env.PLUGIN_PATH), os.ModePerm)
	os.RemoveAll(GetAbsolutePath(env.TMP_PATH))
	os.MkdirAll(GetAbsolutePath(env.TMP_PATH), os.ModePerm)
}
