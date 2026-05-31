package crawler

import (
	"container/heap"
	"context"
	"path/filepath"
	"sync"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/config"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/indexer"
)

type daemonState struct {
	discovery bool
	idx       []Crawler
	n         int
	mu        sync.RWMutex
}

func NewDaemon(withDiscovery bool) daemonState {
	return daemonState{
		discovery: withDiscovery,
		idx:       make([]Crawler, 0),
		n:         -1,
	}
}

type Crawler struct {
	Id             string
	FoldersUnknown HeapDoc
	CurrentPhase   string
	Backend        IBackend
	State          indexer.Index
	mu             sync.Mutex
}

func (this *daemonState) createCrawler(app *App) (Crawler, error) {
	id := GenerateID(app.Session)
	idpath := id
	if SEARCH_SHARED_INDEX() {
		idpath = ""
	}
	s := Crawler{
		Id:             id,
		Backend:        app.Backend,
		State:          indexer.NewIndex(idpath),
		FoldersUnknown: make(HeapDoc, 0, 1),
	}
	if err := s.State.Init(); err != nil {
		return s, err
	}
	heap.Init(&s.FoldersUnknown)
	return s, nil
}

func (this *daemonState) GetCrawler(app *App, create bool) (Crawler, error) {
	id := GenerateID(app.Session)
	this.mu.RLock()
	defer this.mu.RUnlock()
	for i := len(this.idx) - 1; i >= 0; i-- {
		if id == this.idx[i].Id {
			return this.idx[i], nil
		}
	}
	if create == false {
		return Crawler{}, ErrNotFound
	}
	return this.createCrawler(app)
}

func (this *daemonState) NextCrawler() *Crawler {
	this.mu.Lock()
	defer this.mu.Unlock()
	if len(this.idx) == 0 {
		return nil
	}
	if this.n >= len(this.idx)-1 || this.n < 0 {
		this.n = 0
	} else {
		this.n = this.n + 1
	}
	return &this.idx[this.n]
}

func (this *daemonState) HintLs(app *App, path string) {
	if this.discovery == false {
		return
	}
	id := GenerateID(app.Session)
	this.mu.Lock()
	defer this.mu.Unlock()

	// try to find the search indexer among the existing ones
	for i := len(this.idx) - 1; i >= 0; i-- {
		if id != this.idx[i].Id {
			continue
		}
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
		return
	}

	// Having all indexers running in memory could be expensive => instead we're cycling a pool
	search_process_max := SEARCH_PROCESS_MAX()
	lenIdx := len(this.idx)
	if lenIdx > 0 && search_process_max > 0 && lenIdx > (search_process_max-1) {
		toDel := this.idx[0 : lenIdx-(search_process_max-1)]
		for i := range toDel {
			toDel[i].Close()
		}
		this.idx = this.idx[lenIdx-(search_process_max-1):]
	}
	// instantiate the new indexer
	app.Context = context.Background()
	crawlerBackend, err := app.Backend.Init(app.Session, app)
	if err != nil {
		Log.Warning("plg_search_sqlitefs::init message=cannot_create_crawler err=%s", err.Error())
		return
	}
	app.Backend = crawlerBackend
	s, err := this.createCrawler(app)
	if err != nil {
		Log.Warning("plg_search_sqlitefs::init message=cannot_create_crawler err=%s", err.Error())
		return
	}
	defer func() {
		// recover from panic if one occurred. Set err to nil otherwise.
		if r := recover(); r != nil {
			name := "na"
			for _, el := range crawlerBackend.LoginForm().Elmnts {
				if el.Name == "type" {
					name = el.Value.(string)
				}
			}
			Log.Error("plg_search_sqlitefs::panic backend=\"%s\" recover=\"%s\"", name, r)
		}
	}()
	heap.Push(&s.FoldersUnknown, &Document{
		Type:        "directory",
		Path:        path,
		InitialPath: path,
		Name:        filepath.Base(path),
	})
	this.idx = append(this.idx, s)
}

func (this *daemonState) HintRm(app *App, path string) {
	crwlr, err := this.GetCrawler(app, this.discovery == false)
	if err != nil {
		return
	}
	op, err := crwlr.State.Change()
	if err != nil {
		return
	}
	op.RemoveAll(path)
	op.Commit()
}

func (this *daemonState) HintFile(app *App, path string) {
	crwlr, err := this.GetCrawler(app, this.discovery == false)
	if err != nil {
		return
	}
	op, err := crwlr.State.Change()
	if err != nil {
		return
	}
	op.IndexTimeClear(path)
	op.Commit()
}
