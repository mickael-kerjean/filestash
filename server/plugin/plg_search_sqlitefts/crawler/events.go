package plg_search_sqlitefts

import (
	"container/heap"
	"context"
	"path/filepath"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/plugin/plg_search_sqlitefts/config"
)

/*
 * We're listening to what the user is doing to hint the crawler over
 * what needs to be updated in priority, what file got updated and would need
 * to be reindexed, what should disappear from the index, ....
 * This way we can fine tune how full text search is behaving
 */

type FileHook struct{}

func (this FileHook) Ls(ctx *App, path string) error {
	if this.record(ctx) {
		go DaemonState.HintLs(ctx, path)
	}
	return nil
}

func (this FileHook) Cat(ctx *App, path string) error {
	if this.record(ctx) {
		go DaemonState.HintLs(ctx, filepath.Dir(path)+"/")
	}
	return nil
}

func (this FileHook) Stat(ctx *App, path string) error {
	return nil
}

func (this FileHook) Mkdir(ctx *App, path string) error {
	if this.record(ctx) {
		go func() {
			DaemonState.HintLs(ctx, filepath.Dir(path)+"/")
			DaemonState.HintLs(ctx, path)
		}()
	}
	return nil
}

func (this FileHook) Rm(ctx *App, path string) error {
	if this.record(ctx) {
		go DaemonState.HintRm(ctx, path)
	}
	return nil
}

func (this FileHook) Mv(ctx *App, from string, to string) error {
	if this.record(ctx) {
		go func() {
			DaemonState.HintRm(ctx, filepath.Dir(from)+"/")
			DaemonState.HintLs(ctx, to+"/")
			DaemonState.HintLs(ctx, filepath.Dir(to)+"/")
		}()
	}
	return nil
}

func (this FileHook) Save(ctx *App, path string) error {
	if this.record(ctx) {
		go func() {
			DaemonState.HintLs(ctx, filepath.Dir(path)+"/")
			DaemonState.HintFile(ctx, path)
		}()
	}
	return nil
}

func (this FileHook) Touch(ctx *App, path string) error {
	if this.record(ctx) {
		go func() {
			DaemonState.HintLs(ctx, filepath.Dir(path)+"/")
			DaemonState.HintFile(ctx, path)
		}()
	}
	return nil
}

func (this FileHook) record(ctx *App) bool {
	if ctx.Context.Value("AUDIT") == false {
		return false
	}
	return true
}

func (this *daemonState) HintLs(app *App, path string) {
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
	s, err := NewCrawler(app)
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
	id := GenerateID(app.Session)
	this.mu.RLock()
	for i := len(this.idx) - 1; i >= 0; i-- {
		if id != this.idx[i].Id {
			continue
		}
		if op, err := this.idx[i].State.Change(); err == nil {
			op.RemoveAll(path)
			op.Commit()
		}
		break
	}
	this.mu.RUnlock()
}

func (this *daemonState) HintFile(app *App, path string) {
	id := GenerateID(app.Session)
	this.mu.RLock()
	for i := len(this.idx) - 1; i >= 0; i-- {
		if id != this.idx[i].Id {
			continue
		}
		if op, err := this.idx[i].State.Change(); err == nil {
			op.IndexTimeClear(path)
			op.Commit()
		}
		break
	}
	this.mu.RUnlock()
}

func (this *daemonState) Reset() {
	this.mu.Lock()
	for i := range this.idx {
		this.idx[i].Close()
	}
	this.idx = make([]Crawler, 0)
	this.n = -1
	this.mu.Unlock()
}
