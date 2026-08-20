package ctrl

import (
	"github.com/mickael-kerjean/filestash/server/pkg/frontend"
	"github.com/mickael-kerjean/filestash/server/pkg/kernel"
)

// tmpl.go
var (
	TmplExec   = kernel.TmplExec
	TmplParams = kernel.TmplParams
)

// frontend
var (
	InitPluginList = frontend.InitPluginList
	HasPlugin      = frontend.HasPlugin
)
