package plg_widget_recent

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Onload(func() {
		PluginEnable()
		PluginFolderName()
		PluginEnableAI()
		PluginEndpoint()
		PluginModel()
		PluginAPIKey()
	})
}

var PluginEnable = func() bool {
	return Config.Get("features.recent.enable").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "enable"
		f.Type = "enable"
		f.Target = []string{
			"recent_folder_name",
			"recent_enable_ai",
			"recent_model_address",
			"recent_model_name",
			"recent_api_key",
		}
		f.Default = false
		return f
	}).Bool()
}

var PluginFolderName = func() string {
	return Config.Get("features.recent.folder_name").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "recent_folder_name"
		f.Name = "folder_name"
		f.Type = "text"
		f.Description = "Name of the virtual folder for recent files"
		f.Default = "Recent"
		f.Placeholder = "Recent"
		return f
	}).String()
}

var PluginEnableAI = func() bool {
	return Config.Get("features.recent.enable_ai").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "recent_enable_ai"
		f.Name = "enable_ai"
		f.Type = "boolean"
		f.Description = "Use AI to power search within recent files"
		f.Default = false
		return f
	}).Bool()
}

var PluginEndpoint = func() string {
	return Config.Get("features.recent.model_address").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "recent_model_address"
		f.Name = "model_address"
		f.Type = "text"
		f.Default = "https://api.openai.com/v1/chat/completions"
		f.Placeholder = "default: https://api.openai.com/v1/chat/completions"
		return f
	}).String()
}

var PluginModel = func() string {
	return Config.Get("features.recent.model_name").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "recent_model_name"
		f.Name = "model_name"
		f.Type = "text"
		f.Default = "gpt-4o-mini"
		f.Placeholder = "default: gpt-4o-mini"
		return f
	}).String()
}

var PluginAPIKey = func() string {
	return Config.Get("features.recent.api_key").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "recent_api_key"
		f.Name = "api_key"
		f.Type = "password"
		f.Placeholder = "sk-..."
		return f
	}).String()
}
