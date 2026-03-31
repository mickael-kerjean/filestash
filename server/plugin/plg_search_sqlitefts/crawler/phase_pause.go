package plg_search_sqlitefts

import (
	"time"

	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/indexer"
)

func (this *Crawler) Pause(tx indexer.Manager) bool {
	if this.FoldersUnknown.Len() == 0 {
		time.Sleep(10 * time.Second)
	}
	this.Next()
	return false
}
