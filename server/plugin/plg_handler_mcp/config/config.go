package plg_handler_mcp

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

var PluginEnable = func() bool {
	return Config.Get("features.mcp.enable").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "enable"
		f.Type = "enable"
		f.Target = []string{"mcp_can_edit"}
		f.Description = "Enable/Disable the Model Context Protocol"
		f.Default = false
		return f
	}).Bool()
}

var CanEdit = func() bool {
	return Config.Get("features.mcp.can_edit").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "mcp_can_edit"
		f.Name = "can_edit"
		f.Type = "boolean"
		f.Description = "Enable/Disable editing"
		f.Default = false
		return f
	}).Bool()
}
