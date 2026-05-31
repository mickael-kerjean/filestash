package crawler

import (
	"path/filepath"

	. "github.com/mickael-kerjean/filestash/server/common"
)

/*
 * We're listening to what the user is doing to hint the crawler over
 * what needs to be updated in priority, what file got updated and would need
 * to be reindexed, what should disappear from the index, ....
 * This way we can fine tune how full text search is behaving
 */

type FileHook struct {
	Daemon IndexerOp
}

type IndexerOp interface {
	HintLs(ctx *App, path string)
	HintRm(ctx *App, path string)
	HintFile(ctx *App, path string)
}

func (this FileHook) Ls(ctx *App, path string) error {
	if this.record(ctx) {
		go this.Daemon.HintLs(ctx, path)
	}
	return nil
}

func (this FileHook) Cat(ctx *App, path string) error {
	if this.record(ctx) {
		go this.Daemon.HintLs(ctx, filepath.Dir(path)+"/")
	}
	return nil
}

func (this FileHook) Stat(ctx *App, path string) error {
	return nil
}

func (this FileHook) Mkdir(ctx *App, path string) error {
	if this.record(ctx) {
		go func() {
			this.Daemon.HintLs(ctx, filepath.Dir(path)+"/")
			this.Daemon.HintLs(ctx, path)
		}()
	}
	return nil
}

func (this FileHook) Rm(ctx *App, path string) error {
	if this.record(ctx) {
		go this.Daemon.HintRm(ctx, path)
	}
	return nil
}

func (this FileHook) Mv(ctx *App, from string, to string) error {
	if this.record(ctx) {
		go func() {
			this.Daemon.HintRm(ctx, filepath.Dir(from)+"/")
			this.Daemon.HintLs(ctx, to+"/")
			this.Daemon.HintLs(ctx, filepath.Dir(to)+"/")
		}()
	}
	return nil
}

func (this FileHook) Save(ctx *App, path string) error {
	if this.record(ctx) {
		go func() {
			this.Daemon.HintLs(ctx, filepath.Dir(path)+"/")
			this.Daemon.HintFile(ctx, path)
		}()
	}
	return nil
}

func (this FileHook) Touch(ctx *App, path string) error {
	if this.record(ctx) {
		go func() {
			this.Daemon.HintLs(ctx, filepath.Dir(path)+"/")
			this.Daemon.HintFile(ctx, path)
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
