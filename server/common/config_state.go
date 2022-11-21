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
	"io/ioutil"
	"os"
	"path/filepath"
)

var (
	configPath          string   = filepath.Join(GetCurrentDir(), CONFIG_PATH+"config.json")
	configKeysToEncrypt []string = []string{
		"middleware.identity_provider.params",
		"middleware.attribute_mapping.params",
	}
)

func LoadConfig() ([]byte, error) {
	file, err := os.OpenFile(configPath, os.O_RDONLY, os.ModePerm)
	if err != nil {
		return nil, err
	}
	cFile, err := ioutil.ReadAll(file)
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
			continue
		}
		val, err := sjson.Set(configStr, jsonPathWithEncryptedData, t)
		if err != nil {
			continue
		}
		configStr = val
	}
	return []byte(configStr), nil
}

func SaveConfig(v []byte) error {
	file, err := os.Create(configPath)
	if err != nil {
		return fmt.Errorf(
			"Filestash needs to be able to create/edit its own configuration which it can't at the moment. "+
				"Change the permission for filestash to create and edit `%s`",
			configPath,
		)
	}

	configStr := string(v)
	for _, jsonPath := range configKeysToEncrypt {
		key := os.Getenv("CONFIG_SECRET")
		if key == "" {
			key = SECRET_KEY_DERIVATE_FOR_PROOF
		}
		p := gjson.Get(configStr, jsonPath).String()
		if p == "" {
			continue
		}
		t, err := EncryptString(Hash(key, 16), p)
		if err != nil {
			Log.Warning("common::config_state cannot encrypt config path '%s'", jsonPath)
			continue
		}
		val, err := sjson.Set(configStr, jsonPath, t)
		if err != nil {
			Log.Warning("common::config_state cannot put json value in config '%s'", jsonPath)
			continue
		}
		configStr = val
	}
	file.Write(PrettyPrint([]byte(configStr)))
	return file.Close()
}
