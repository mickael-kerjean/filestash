package plg_handler_site

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Onload(func() {
		PluginEnable()
		PluginParamAutoindex()
		PluginParamCORSAllowOrigins()
	})

}

var PluginEnable = func() bool {
	return Config.Get("features.site.enable").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "enable"
		f.Type = "enable"
		f.Target = []string{"site_autoindex", "site_cors_allow_origins"}
		f.Description = "Enable/Disable the creation of site via shared links. Sites will be made available under /public/{shareID}/"
		f.Default = false
		return f
	}).Bool()
}

var PluginParamAutoindex = func() bool {
	return Config.Get("features.site.autoindex").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "site_autoindex"
		f.Name = "autoindex"
		f.Type = "boolean"
		f.Description = "Enables or disables automatic directory listing when no index file is present."
		f.Default = false
		return f
	}).Bool()
}

var PluginParamCORSAllowOrigins = func() string {
	return Config.Get("features.site.cors_allow_origins").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "site_cors_allow_origins"
		f.Name = "cors_allow_origins"
		f.Type = "text"
		f.Placeholder = "* or https://example.com, https://app.example.com"
		f.Description = "List of allowed origins for CORS. Use '*' to allow all origins, or provide a comma-separated list."
		return f
	}).String()
}
