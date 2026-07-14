package files

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Onload(func() {
		zip_timeout()
		disable_csp()
	})
}

func zip_timeout() int {
	return Config.Get("features.protection.zip_timeout").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Default = 60
		f.Name = "zip_timeout"
		f.Type = "number"
		f.Description = "Timeout when user wants to download or extract a zip"
		f.Placeholder = "Default: 60seconds"
		return f
	}).Int()
}

func disable_csp() bool {
	return Config.Get("features.protection.disable_csp").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Default = false
		f.Name = "disable_csp"
		f.Type = "boolean"
		f.Description = "Disable the content security policy. Unless you 100% trust the content in your storage and want to execute code running from that storage, you shouldn't have this option checked"
		return f
	}).Bool()
}
