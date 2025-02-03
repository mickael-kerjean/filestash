package plg_search_sqlitefts

import (
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/indexer"
)

func (this *Crawler) Run() {
	if this.CurrentPhase == "" {
		time.Sleep(1 * time.Second)
		this.CurrentPhase = PHASE_EXPLORE
	}
	Log.Debug("Search::indexing Execute %s", this.CurrentPhase)

	cycleExecute := func(fn func(indexer.Manager) bool) {
		stopTime := time.Now().Add(time.Duration(CYCLE_TIME()) * time.Second)
		op, err := this.State.Change()
		if err != nil {
			Log.Warning("search::index cycle_begin (%+v)", err)
			time.Sleep(5 * time.Second)
		}
		for {
			if fn(op) == false {
				break
			}
			if stopTime.After(time.Now()) == false {
				break
			}
		}
		if err = op.Commit(); err != nil {
			Log.Warning("search::index cycle_commit (%+v)", err)
		}
	}
	if this.CurrentPhase == PHASE_EXPLORE {
		cycleExecute(this.Discover)
		return
	} else if this.CurrentPhase == PHASE_INDEXING {
		cycleExecute(this.Indexing)
		return
	} else if this.CurrentPhase == PHASE_MAINTAIN {
		cycleExecute(this.Consolidate)
		return
	} else if this.CurrentPhase == PHASE_PAUSE {
		time.Sleep(5 * time.Second)
		this.CurrentPhase = ""
	}
	return
}

func (this *Crawler) Close() error {
	return this.State.Close()
}
