package plg_search_sqlitefts

import (
	"container/heap"
	"sync"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/config"
	"github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/indexer"
)

var DaemonState = daemonState{
	idx: make([]Crawler, 0),
	n:   -1,
}

type daemonState struct {
	idx []Crawler
	n   int
	mu  sync.RWMutex
}

type Crawler struct {
	Id             string
	FoldersUnknown HeapDoc
	CurrentPhase   string
	Backend        IBackend
	State          indexer.Index
	mu             sync.Mutex
}

func NewCrawler(app *App) (Crawler, error) {
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

func GetCrawler(app *App) *Crawler {
	id := GenerateID(app.Session)
	DaemonState.mu.RLock()
	defer DaemonState.mu.RUnlock()
	for i := len(DaemonState.idx) - 1; i >= 0; i-- {
		if id == DaemonState.idx[i].Id {
			return &DaemonState.idx[i]
		}
	}
	return nil
}

func NextCrawler() *Crawler {
	DaemonState.mu.Lock()
	defer DaemonState.mu.Unlock()
	if len(DaemonState.idx) == 0 {
		return nil
	}
	if DaemonState.n >= len(DaemonState.idx)-1 || DaemonState.n < 0 {
		DaemonState.n = 0
	} else {
		DaemonState.n = DaemonState.n + 1
	}
	return &DaemonState.idx[DaemonState.n]
}
