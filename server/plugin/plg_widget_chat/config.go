package plg_widget_chat

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Onload(func() {
		PluginEnable()
	})
}

var PluginEnable = func() bool {
	return Config.Get("features.chat.enable").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "enable"
		f.Type = "enable"
		f.Target = []string{}
		f.Default = false
		return f
	}).Bool()
}
