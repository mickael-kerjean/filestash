package plg_search_sqlitefts

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/crawler"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/workflow"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/config"
)

func init() {
	Hooks.Register.SearchEngine(SearchEngine{})
	Hooks.Register.WorkflowAction(StepIndexer{})

	Hooks.Register.Onload(func() {
		if SEARCH_ENABLE() {
			Hooks.Register.AuthorisationMiddleware(FileHook{})
		}
	})
}
