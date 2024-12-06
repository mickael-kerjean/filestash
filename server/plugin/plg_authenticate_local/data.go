package plg_authenticate_local

import (
	"encoding/json"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func getPluginData() (pluginConfig, error) {
	var cfg pluginConfig
	if Config.Get("middleware.identity_provider.type").String() != "local" {
		Log.Warning("plg_authenticate_simple::disable msg=middleware_is_not_enabled")
		return cfg, ErrMissingDependency
	}
	if err := json.Unmarshal(
		[]byte(Config.Get("middleware.identity_provider.params").String()),
		&cfg,
	); err != nil {
		return cfg, err
	}
	if cfg.DB != "" {
		if err := json.Unmarshal(
			[]byte(cfg.DB),
			&cfg.Users,
		); err != nil {
			return cfg, err
		}
	}
	return cfg, nil
}

func savePluginData(cfg pluginConfig) error {
	if Config.Get("middleware.identity_provider.type").String() != "local" {
		Log.Warning("plg_authenticate_simple::disable msg=middleware_is_not_enabled")
		return ErrMissingDependency
	}
	a, err := json.Marshal(cfg.Users)
	if err != nil {
		return err
	}
	cfg.DB = string(a)
	b, err := json.Marshal(cfg)
	if err != nil {
		return err
	}
	Config.Get("middleware.identity_provider.params").Set(string(b))
	return nil
}
