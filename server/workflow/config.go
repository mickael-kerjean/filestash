package workflow

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Onload(func() {
		PluginEnable()
		PluginNumberWorker()
	})
}

var PluginEnable = func() bool {
	return Config.Get("features.workflow.enable").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "enable"
		f.Type = "enable"
		f.Target = []string{"workflow_workers"}
		f.Description = "Enable/Disable workflows"
		f.Default = true
		return f
	}).Bool()
}

var PluginNumberWorker = func() int {
	return Config.Get("features.workflow.workers").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "workflow_workers"
		f.Name = "workers"
		f.Type = "number"
		f.Description = "Number of workers running in parallel. Default: 1"
		f.Default = 1
		return f
	}).Int()
}
