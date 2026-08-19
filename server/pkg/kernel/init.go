package kernel

import (
	"os"

	"github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func init() {
	config.RegisterChange(func() {
		for _, fn := range Hooks.Get.OnConfig() {
			fn()
		}
	})
	Hooks.Register.Onload(func() {
		if err := os.Chmod(GetAbsolutePath(CONFIG_PATH), 0770); err != nil && os.IsNotExist(err) == false {
			Log.Warning("common::config_state::onload cannot chmod config directory: %s", err.Error())
		}
		if err := os.Chmod(GetAbsolutePath(CONFIG_PATH, "config.json"), 0660); err != nil && os.IsNotExist(err) == false {
			Log.Warning("common::config_state::onload cannot chmod config file: %s", err.Error())
		}
	})
}
