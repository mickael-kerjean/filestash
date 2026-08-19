package config

/*
 * WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNI
 * WARNING - CHANGE IN THIS FILE CAN SILENTLY BREAK OTHER INSTALLATION - WARNING
 * WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARNING WARN
 *
 * Some contributors wanted to be able to load and persist config in other system
 * like S3 and provide custom encryption layer on top of it. Those contributors have
 * custom plugins which run generators that override this file before the build is
 * generated. Indeed for that specific use case we couldn't extend the runtime plugin
 * mechanism so had to fallback to this approach which would set the config loader at
 * build time, hence this warning.
 */

import (
	"fmt"
	"io"
	"os"

	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

var configKeysToEncrypt []string = []string{
	"middleware.identity_provider.params",
	"middleware.attribute_mapping.params",
}

func InitSecretDerivate(secret string) {
	SECRET_KEY = secret
	SECRET_KEY_DERIVATE_FOR_PROOF = Hash("PROOF_"+SECRET_KEY, len(SECRET_KEY))
	SECRET_KEY_DERIVATE_FOR_ADMIN = Hash("ADMIN_"+SECRET_KEY, len(SECRET_KEY))
	SECRET_KEY_DERIVATE_FOR_USER = Hash("USER_"+SECRET_KEY, len(SECRET_KEY))
	SECRET_KEY_DERIVATE_FOR_HASH = Hash("HASH_"+SECRET_KEY, len(SECRET_KEY))
	SECRET_KEY_DERIVATE_FOR_SIGNATURE = Hash("SGN_"+SECRET_KEY, len(SECRET_KEY))
}

func LoadConfig() ([]byte, error) {
	file, err := os.OpenFile(GetAbsolutePath(CONFIG_PATH, "config.json"), os.O_RDONLY, os.ModePerm)
	if err != nil {
		if os.IsNotExist(err) {
			os.MkdirAll(GetAbsolutePath(CONFIG_PATH), 0770)
			return []byte(""), nil
		}
		return nil, err
	}
	cFile, err := io.ReadAll(file)
	file.Close()
	if err != nil {
		return nil, err
	}
	configStr := string(cFile)
	if os.Getenv("CONFIG_SECRET") == "" {
		InitSecretDerivate(gjson.Get(configStr, "general.secret_key").String())
	}
	key := defaultValue(SECRET_KEY_DERIVATE_FOR_PROOF, "CONFIG_SECRET")
	for _, jsonPathWithEncryptedData := range configKeysToEncrypt {
		p := gjson.Get(configStr, jsonPathWithEncryptedData).String()
		if p == "" {
			continue
		}
		t, err := DecryptString(Hash(key, 16), p)
		if err != nil {
			if !defaultValue(true, "CONFIG_ENCRYPT") {
				break
			}
			Log.Warning("common::config_state::load cannot decrypt config path '%s': %s", jsonPathWithEncryptedData, err.Error())
			continue
		}
		val, err := sjson.Set(configStr, jsonPathWithEncryptedData, t)
		if err != nil {
			Log.Warning("common::config_state::load cannot put json value in config '%s': %s", jsonPathWithEncryptedData, err.Error())
			continue
		}
		configStr = val
	}
	return []byte(configStr), nil
}

func SaveConfig(v []byte) error {
	file, err := os.OpenFile(GetAbsolutePath(CONFIG_PATH, "config.json"), os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0660)
	if err != nil {
		return fmt.Errorf(
			APPNAME+" needs to be able to create and edit its configuration, but it currently cannot. "+
				"Change the permissions to allow writing to `%s`",
			GetAbsolutePath(CONFIG_PATH, "config.json"),
		)
	}

	configStr := string(v)

	var (
		key       = defaultValue(SECRET_KEY_DERIVATE_FOR_PROOF, "CONFIG_SECRET")
		toEncrypt = defaultValue(true, "CONFIG_ENCRYPT")
	)
	for _, jsonPathWithEncryptedData := range configKeysToEncrypt {
		if !toEncrypt {
			continue
		}
		p := gjson.Get(configStr, jsonPathWithEncryptedData).String()
		if p == "" {
			continue
		}
		t, err := EncryptString(Hash(key, 16), p)
		if err != nil {
			Log.Warning("common::config_state::save cannot encrypt config path '%s': %s", jsonPathWithEncryptedData, err.Error())
			continue
		}
		val, err := sjson.Set(configStr, jsonPathWithEncryptedData, t)
		if err != nil {
			Log.Warning("common::config_state::save cannot put json value in config '%s': %s", jsonPathWithEncryptedData, err.Error())
			continue
		}
		configStr = val
	}
	file.Write(PrettyPrint([]byte(configStr)))
	if err = file.Sync(); err != nil {
		file.Close()
		return err
	}
	return file.Close()
}
