package plg_search_sqlitefts

import (
	"container/heap"
	"context"
	"path/filepath"
	"reflect"
	"sync"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var SProc SearchProcess = SearchProcess{
	idx: make([]SearchIndexer, 0),
	n:   -1,
}

type SearchProcess struct {
	idx []SearchIndexer
	n   int
	mu  sync.RWMutex
}

func (this *SearchProcess) HintLs(app *App, path string) *SearchIndexer {
	id := GenerateID(app.Session)

	// try to find the search indexer among the existing ones
	this.mu.RLock()
	for i := len(this.idx) - 1; i >= 0; i-- {
		if id == this.idx[i].Id {
			alreadyHasPath := false
			for j := 0; j < len(this.idx[i].FoldersUnknown); j++ {
				if this.idx[i].FoldersUnknown[j].Path == path {
					alreadyHasPath = true
					break
				}
			}
			if alreadyHasPath == false {
				heap.Push(&this.idx[i].FoldersUnknown, &Document{
					Type:        "directory",
					Path:        path,
					InitialPath: path,
					Name:        filepath.Base(path),
				})
			}
			ret := &this.idx[i]
			this.mu.RUnlock()
			return ret
		}
	}
	this.mu.RUnlock()

	// Having all indexers running in memory could be expensive => instead we're cycling a pool
	search_process_max := SEARCH_PROCESS_MAX()
	this.mu.Lock()
	lenIdx := len(this.idx)
	if lenIdx > 0 && search_process_max > 0 && lenIdx > (search_process_max-1) {
		toDel := this.idx[0 : lenIdx-(search_process_max-1)]
		for i := range toDel {
			toDel[i].DB.Close()
		}
		this.idx = this.idx[lenIdx-(search_process_max-1):]
	}
	// instantiate the new indexer
	s := NewSearchIndexer(id, app.Backend)
	defer func() {
		// recover from panic if one occurred. Set err to nil otherwise.
		if recover() != nil {
			name := "na"
			for _, el := range app.Backend.LoginForm().Elmnts {
				if el.Name == "type" {
					name = el.Value.(string)
				}
			}
			Log.Error("plg_search_sqlitefs::panic backend=\"%s\"", name)
		}
	}()
	v := reflect.ValueOf(app.Backend).Elem().FieldByName("Context")
	if v.IsValid() && v.CanSet() {
		// prevent context expiration which is often default as r.Context()
		// as we need to make queries outside the scope of a normal http request
		v.Set(reflect.ValueOf(context.Background()))
	}

	heap.Push(&s.FoldersUnknown, &Document{
		Type:        "directory",
		Path:        path,
		InitialPath: path,
		Name:        filepath.Base(path),
	})
	this.idx = append(this.idx, s)
	this.mu.Unlock()
	return &s
}

func (this *SearchProcess) HintRm(app *App, path string) {
	id := GenerateID(app.Session)
	this.mu.RLock()
	for i := len(this.idx) - 1; i >= 0; i-- {
		if id == this.idx[i].Id {
			this.idx[i].DB.Exec("DELETE FROM file WHERE path >= ? AND path < ?", path, path+"~")
			break
		}
	}
	this.mu.RUnlock()
}

func (this *SearchProcess) HintFile(app *App, path string) {
	id := GenerateID(app.Session)
	this.mu.RLock()
	for i := len(this.idx) - 1; i >= 0; i-- {
		if id == this.idx[i].Id {
			this.idx[i].DB.Exec("UPDATE file set indexTime = NULL WHERE path = ?", path)
			break
		}
	}
	this.mu.RUnlock()
}

func (this *SearchProcess) Peek() *SearchIndexer {
	if len(this.idx) == 0 {
		return nil
	}
	this.mu.Lock()
	if this.n >= len(this.idx)-1 || this.n < 0 {
		this.n = 0
	} else {
		this.n = this.n + 1
	}
	s := &this.idx[this.n]
	this.mu.Unlock()
	return s
}

func (this *SearchProcess) Reset() {
	this.mu.Lock()
	for i := range this.idx {
		this.idx[i].DB.Close()
	}
	this.idx = make([]SearchIndexer, 0)
	this.mu.Unlock()
	this.n = -1
}
