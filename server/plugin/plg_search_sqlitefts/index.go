package plg_search_sqlitefts

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/crawler"
)

func init() {
	Hooks.Register.SearchEngine(SearchEngine{})
	Hooks.Register.AuthorisationMiddleware(FileHook{})
}
