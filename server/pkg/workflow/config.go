package workflow

import (
	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
)

func init() {
	Hooks.Register.Onload(func() {
		PluginEnable()
		PluginNumberWorker()
		PluginMaxQueue()
	})
}

var PluginEnable = func() bool {
	return Config.Get("features.workflow.enable").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "enable"
		f.Type = "enable"
		f.Target = []string{"workflow_workers", "workflow_max_queue"}
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

var PluginMaxQueue = func() int {
	return Config.Get("features.workflow.max_queue").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "workflow_max_queue"
		f.Name = "max_queue"
		f.Type = "number"
		f.Description = "Maximum number of queued jobs per workflow. Default: 5"
		f.Default = 5
		return f
	}).Int()
}
