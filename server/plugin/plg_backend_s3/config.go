package plg_backend_s3

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"time"
)

var ls_timeout func() time.Duration

func init() {
	ls_timeout = func() time.Duration {
		return time.Duration(Config.Get("features.protection.ls_timeout").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Default = 2
			f.Name = "ls_timeout"
			f.Type = "number"
			f.Target = []string{}
			f.Description = "failsafe timeout for listing files under a folder"
			f.Placeholder = "Default: 2"
			return f
		}).Int()) * time.Second
	}
	ls_timeout()
}
