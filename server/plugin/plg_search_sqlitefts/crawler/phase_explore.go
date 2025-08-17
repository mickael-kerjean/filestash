package plg_search_sqlitefts

import (
	"container/heap"
	"path/filepath"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/indexer"
)

func (this *Crawler) Discover(tx indexer.Manager) bool {
	if this.FoldersUnknown.Len() == 0 {
		this.Next()
		return false
	}
	var doc *Document
	doc = heap.Pop(&this.FoldersUnknown).(*Document)
	if doc == nil {
		this.Next()
		return false
	}

	files, err := this.Backend.Ls(doc.Path)
	if err != nil {
		this.CurrentPhase = PHASE_PAUSE
		return true
	}

	excluded := SEARCH_EXCLUSION()
	for i := range files {
		f := files[i]
		name := f.Name()
		skip := false
		for i := 0; i < len(excluded); i++ {
			if name == excluded[i] || strings.Contains(doc.Path, excluded[i]) {
				skip = true
			}
		}
		if skip {
			continue
		}
		if f.IsDir() {
			var performPush bool = false
			p := filepath.Join(doc.Path, name)
			p += "/"
			if err = dbInsert(doc.Path, f, tx); err == nil {
				performPush = true
			} else if err == indexer.ErrConstraint {
				performPush = func(path string) bool {
					tm, err := tx.IndexTimeGet(p)
					if err != nil {
						Log.Warning("search::discovery unknown_path (%v)", err)
						return false
					}
					if time.Now().Add(time.Duration(-SEARCH_REINDEX()) * time.Hour).Before(tm) {
						return false
					}
					if err = tx.IndexTimeUpdate(p, time.Now()); err != nil {
						Log.Warning("search::discovery insertion_failed (%v)", err)
						return false
					}
					return true
				}(p)
			} else {
				Log.Error("search::indexing insert_index (%v)", err)
			}
			if performPush == true {
				heap.Push(&this.FoldersUnknown, &Document{
					Type:    "directory",
					Name:    name,
					Path:    p,
					Size:    f.Size(),
					ModTime: f.ModTime(),
				})
			}
		} else {
			if err = dbInsert(doc.Path, f, tx); err != nil {
				if err == indexer.ErrConstraint {
					return false
				}
				Log.Warning("search::insert index_error (%v)", err)
				return false
			}
		}
	}
	return true
}
