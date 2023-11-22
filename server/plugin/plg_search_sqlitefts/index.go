package plg_search_sqlitefts

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"path/filepath"
	"regexp"
	"time"
)

const (
	PHASE_EXPLORE  = "PHASE_EXPLORE"
	PHASE_INDEXING = "PHASE_INDEXING"
	PHASE_MAINTAIN = "PHASE_MAINTAIN"
	PHASE_PAUSE    = "PHASE_PAUSE"
)

func init() {
	sh := SearchHint{}
	Hooks.Register.SearchEngine(SqliteSearch{Hint: &sh})
	Hooks.Register.AuthorisationMiddleware(&sh)
}

type SqliteSearch struct {
	Hint *SearchHint
}

func (this SqliteSearch) Query(app App, path string, keyword string) ([]IFile, error) {
	files := []IFile{}

	// extract our search indexer
	s := SProc.HintLs(&app, path)
	if s == nil {
		return files, ErrNotReachable
	}

	if path == "" {
		path = "/"
	}

	rows, err := s.DB.Query(
		"SELECT type, path, size, modTime FROM file WHERE path IN ("+
			"   SELECT path FROM file_index WHERE file_index MATCH ? AND path > ? AND path < ?"+
			"   ORDER BY rank LIMIT 2000"+
			")",
		regexp.MustCompile(`(\.|\-)`).ReplaceAllString(keyword, "\"$1\""),
		path, path+"~",
	)
	if err != nil {
		Log.Warning("search::query DBQuery (%s)", err.Error())
		return files, ErrNotReachable
	}
	defer rows.Close()
	for rows.Next() {
		f := File{}
		var t string
		if err = rows.Scan(&f.FType, &f.FPath, &f.FSize, &t); err != nil {
			Log.Warning("search::query scan (%s)", err.Error())
			return files, ErrNotReachable
		}
		if tm, err := time.Parse(time.RFC3339, t); err == nil {
			f.FTime = tm.Unix() * 1000
		}
		f.FName = filepath.Base(f.FPath)
		files = append(files, f)
	}
	return files, nil
}

/*
 * We're listening to what the user is doing to hint the crawler over
 * what needs to be updated in priority, what file got updated and would need
 * to be reindexed, what should disappear from the index, ....
 * This way we can fine tune how full text search is behaving
 */

type SearchHint struct{}

func (this SearchHint) Ls(ctx *App, path string) error {
	go SProc.HintLs(ctx, path)
	return nil
}

func (this SearchHint) Cat(ctx *App, path string) error {
	go SProc.HintLs(ctx, filepath.Dir(path)+"/")
	return nil
}

func (this SearchHint) Mkdir(ctx *App, path string) error {
	go SProc.HintLs(ctx, filepath.Dir(path)+"/")
	return nil
}

func (this SearchHint) Rm(ctx *App, path string) error {
	go SProc.HintRm(ctx, path)
	return nil
}

func (this SearchHint) Mv(ctx *App, from string, to string) error {
	go SProc.HintRm(ctx, filepath.Dir(from)+"/")
	go SProc.HintLs(ctx, filepath.Dir(to)+"/")
	return nil
}

func (this SearchHint) Save(ctx *App, path string) error {
	go SProc.HintLs(ctx, filepath.Dir(path)+"/")
	go SProc.HintFile(ctx, path)
	return nil
}

func (this SearchHint) Touch(ctx *App, path string) error {
	go SProc.HintLs(ctx, filepath.Dir(path)+"/")
	return nil
}
