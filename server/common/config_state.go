package common

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
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	"io"
	"os"
)

var (
	configKeysToEncrypt []string = []string{
		"middleware.identity_provider.params",
		"middleware.attribute_mapping.params",
	}
	config_path func() string
)

func init() {
	config_path = func() string {
		return GetAbsolutePath(CONFIG_PATH, "config.json")
	}
}

func LoadConfig() ([]byte, error) {
	file, err := os.OpenFile(config_path(), os.O_RDONLY, os.ModePerm)
	if err != nil {
		if os.IsNotExist(err) {
			os.MkdirAll(GetAbsolutePath(CONFIG_PATH), os.ModePerm)
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
	for _, jsonPathWithEncryptedData := range configKeysToEncrypt {
		p := gjson.Get(configStr, jsonPathWithEncryptedData).String()
		if p == "" {
			continue
		}
		key := os.Getenv("CONFIG_SECRET")
		if key == "" {
			InitSecretDerivate(gjson.Get(configStr, "general.secret_key").String())
			key = SECRET_KEY_DERIVATE_FOR_PROOF
		}
		t, err := DecryptString(Hash(key, 16), p)
		if err != nil {
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
	file, err := os.Create(config_path())
	if err != nil {
		return fmt.Errorf(
			APPNAME+" needs to be able to create and edit its configuration, but it currently cannot. "+
				"Change the permissions to allow writing to `%s`",
			config_path(),
		)
	}

	configStr := string(v)
	for _, jsonPathWithEncryptedData := range configKeysToEncrypt {
		key := os.Getenv("CONFIG_SECRET")
		if key == "" {
			key = SECRET_KEY_DERIVATE_FOR_PROOF
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
