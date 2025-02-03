package plg_search_sqlitefts

import (
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/indexer"
)

func (this *Crawler) Indexing(tx indexer.Manager) bool {
	rows, err := tx.FindNew(MAX_INDEXING_FSIZE(), strings.Split(INDEXING_EXT(), ","))
	if err != nil {
		Log.Warning("search::insert index_query (%v)", err)
		return false
	}
	defer rows.Close()
	hasRows := false
	for rows.Next() {
		hasRows = true
		r, err := rows.Value()
		if err != nil {
			Log.Warning("search::indexing index_scan (%v)", err)
			return false
		}
		if err = updateFile(r.Path, this.Backend, tx); err != nil {
			Log.Warning("search::indexing index_update (%v)", err)
			return false
		}
	}

	if hasRows == false {
		this.CurrentPhase = PHASE_MAINTAIN
		return false
	}
	return true
}
