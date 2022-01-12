package plg_search_stateless

import (
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"time"
)

var (
	SEARCH_TIMEOUT func() time.Duration
)

func init() {
	SEARCH_TIMEOUT = func() time.Duration {
		return time.Duration(Config.Get("features.search.explore_timeout").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "explore_timeout"
			f.Type = "number"
			f.Default = 300
			f.Description = `When full text search is disabled, the search engine recursively explore
 directories to find results. Exploration can't last longer than what is configured here`
			f.Placeholder = fmt.Sprintf("Default: %dms", f.Default)
			return f
		}).Int()) * time.Millisecond
	}
	SEARCH_TIMEOUT()

}
