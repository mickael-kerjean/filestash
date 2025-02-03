package plg_search_sqlitefts

import (
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var onConfigChange ChangeListener

func init() {
	onConfigChange = Config.ListenForChange()
	Hooks.Register.Onload(func() {
		for i := 0; i < SEARCH_PROCESS_PAR(); i++ {
			go runner()
		}
	})
}

func runner() {
	startSearch := false
	for {
		if SEARCH_ENABLE() == false {
			select {
			case <-onConfigChange.Listener:
				startSearch = SEARCH_ENABLE()
			}
			if startSearch == false {
				continue
			}
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
