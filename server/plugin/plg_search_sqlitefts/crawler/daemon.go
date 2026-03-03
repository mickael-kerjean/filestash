package plg_search_sqlitefts

import (
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/config"
)

func init() {
	Hooks.Register.Onload(func() {
		for i := 0; i < SEARCH_PROCESS_PAR(); i++ {
			go runner()
		}
	})
}

func runner() {
	for {
		if SEARCH_ENABLE() == false {
			time.Sleep(60 * 5 * time.Second)
			continue
		}
		crwlr := NextCrawler()
		if crwlr == nil {
			time.Sleep(5 * time.Second)
			continue
		}
		crwlr.mu.Lock()
		crwlr.Run()
		crwlr.mu.Unlock()
	}
}
