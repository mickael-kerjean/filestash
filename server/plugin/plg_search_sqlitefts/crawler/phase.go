package plg_search_sqlitefts

import (
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/config"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/indexer"
)

func (this *Crawler) Run() {
	if this.CurrentPhase == "" {
		this.CurrentPhase = PHASE_EXPLORE
	}
	Log.Debug("search::phase Execute %s", this.CurrentPhase)

	cycleExecute := func(fn func(indexer.Manager) bool) {
		op, err := this.State.Change()
		if err != nil {
			Log.Warning("search::index cycle_begin (%+v)", err)
			time.Sleep(5 * time.Second)
		}
		stopTime := time.Now().Add(time.Duration(CYCLE_TIME()) * time.Second)
		for {
			if fn(op) == false {
				break
			}
			if time.Now().After(stopTime) {
				this.Next()
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
		cycleExecute(this.Pause)
		return
	}
	Log.Error("plg_search_sqlitefts::error message=unknown_phase phase=%s", this.CurrentPhase)
	return
}

func (this *Crawler) Close() error {
	return this.State.Close()
}

func (this *Crawler) Next() {
	switch this.CurrentPhase {
	case PHASE_EXPLORE:
		this.CurrentPhase = PHASE_INDEXING
	case PHASE_INDEXING:
		this.CurrentPhase = PHASE_MAINTAIN
	case PHASE_MAINTAIN:
		this.CurrentPhase = PHASE_PAUSE
	case PHASE_PAUSE:
		this.CurrentPhase = PHASE_EXPLORE
	}
}
