package plg_search_sqlitefts

import (
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/config"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/crawler"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/workflow"
)

func init() {
	Hooks.Register.Onload(register)
}

func register() {
	enabled := config.SEARCH_ENABLE()
	daemon := crawler.NewDaemon(enabled)
	Hooks.Register.SearchEngine(SearchEngine{Daemon: &daemon})
	Hooks.Register.AuthorisationMiddleware(crawler.FileHook{Daemon: &daemon})
	Hooks.Register.WorkflowAction(workflow.StepIndexer{Daemon: &daemon})
	if enabled {
		for i := 0; i < config.SEARCH_PROCESS_PAR(); i++ {
			go func() {
				for {
					crwlr := daemon.NextCrawler()
					if crwlr == nil {
						time.Sleep(5 * time.Second)
						continue
					}
					crwlr.Run()
				}
			}()
		}
	}
}
