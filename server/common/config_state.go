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
	"io/ioutil"
	"os"
	"path/filepath"
)

var (
	configPath string = filepath.Join(GetCurrentDir(), CONFIG_PATH+"config.json")
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
	if s := os.Getenv("CONFIG_SECRET"); s != "" {
		t, err := DecryptString(Hash(s, 16), string(cFile))
		if err != nil {
			return cFile, nil
		}
		return []byte(t), err
	}
	return cFile, nil
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
	cFile := PrettyPrint([]byte(v))
	if s := os.Getenv("CONFIG_SECRET"); s != "" {
		t, err := EncryptString(Hash(s, 16), string(cFile))
		if err != nil {
			Log.Error("common::config_state SaveConfig '%s'", err.Error())
			file.Close()
			return err
		}
		cFile = []byte(t)
	}

	file.Write(cFile)
	return file.Close()
}
