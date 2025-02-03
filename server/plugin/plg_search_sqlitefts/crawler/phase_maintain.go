package plg_search_sqlitefts

import (
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/indexer"
)

func (this *Crawler) Consolidate(tx indexer.Manager) bool {
	rows, err := tx.FindBefore(time.Now().Add(-time.Duration(SEARCH_REINDEX()) * time.Hour))
	if err != nil {
		if err == indexer.ErrNoRows {
			this.CurrentPhase = PHASE_PAUSE
			return false
		}
		this.CurrentPhase = ""
		return false
	}
	defer rows.Close()
	hasRows := false
	for rows.Next() {
		hasRows = true
		r, err := rows.Value()
		if err != nil {
			Log.Warning("search::index db_stale (%v)", err)
			return false
		}
		if r.CType == "directory" {
			updateFolder(r.Path, this.Backend, tx)
		} else {
			updateFile(r.Path, this.Backend, tx)
		}
	}
	if hasRows == false {
		this.CurrentPhase = PHASE_PAUSE
		return false
	}
	return true
}
