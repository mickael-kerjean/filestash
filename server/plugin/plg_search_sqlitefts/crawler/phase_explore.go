package plg_search_sqlitefts

import (
	"container/heap"
	"os"
	"path/filepath"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/config"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/indexer"
)

func (this *Crawler) Discover(tx indexer.Manager) bool {
	doc := this.DiscoverPop()
	if doc == nil {
		this.Next()
		return false
	}
	Log.Debug("search::debug phase=discovery path=%s", doc.Path)
	files, err := this.Backend.Ls(doc.Path)
	if err != nil {
		this.CurrentPhase = PHASE_PAUSE
		return true
	}
	return this.DiscoverPush(doc, files, tx)
}

func (this *Crawler) DiscoverPop() *Document {
	if this.FoldersUnknown.Len() == 0 {
		return nil
	}
	return heap.Pop(&this.FoldersUnknown).(*Document)
}

func (this *Crawler) DiscoverPush(doc *Document, files []os.FileInfo, tx indexer.Manager) bool {
	existing := make(map[string]bool, len(files))
	excluded := SEARCH_EXCLUSION()
	for i := range files {
		f := files[i]
		name := f.Name()
		existing[name] = true
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
			p := filepath.Join(doc.Path, name) + "/"
			if err := dbInsert(doc.Path, f, tx); err == nil {
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
			if performPush {
				heap.Push(&this.FoldersUnknown, &Document{
					Type:    "directory",
					Name:    name,
					Path:    p,
					Size:    f.Size(),
					ModTime: f.ModTime(),
				})
			}
		} else {
			if err := dbUpsert(doc.Path, f, tx); err != nil {
				return false
			}
		}
	}
	if rows, err := tx.FindParent(doc.Path); err == nil {
		for rows.Next() {
			if r, err := rows.Value(); err == nil {
				if !existing[r.Name] {
					tx.RemoveAll(r.Path)
				}
			}
		}
		rows.Close()
	}
	return true
}
