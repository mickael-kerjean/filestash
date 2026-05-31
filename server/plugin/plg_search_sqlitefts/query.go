package plg_search_sqlitefts

import (
	"container/heap"
	"path/filepath"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/crawler"
)

type SearchEngine struct {
	Daemon searchDaemon
}

type searchDaemon interface {
	GetCrawler(app *App, create bool) (Crawler, error)
}

func (this SearchEngine) Query(app App, path string, keyword string) ([]IFile, error) {
	crwlr, err := this.Daemon.GetCrawler(&app, true)
	if err != nil {
		return nil, err
	}
	heap.Push(&crwlr.FoldersUnknown, &Document{
		Type:        "directory",
		Path:        path,
		InitialPath: path,
		Name:        filepath.Base(path),
	})
	return crwlr.State.Search(path, keyword)
}
