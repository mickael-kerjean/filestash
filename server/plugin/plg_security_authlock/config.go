package plg_security_authlock

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Onload(func() {
		PluginEnable()
	})
}

var PluginEnable = func() bool {
	return Config.Get("features.protection.auth_lock").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "auth_lock"
		f.Type = "boolean"
		f.Default = false
		f.Description = "Lock authentication solely behind the configured identity provider"
		return f
	}).Bool()
}
