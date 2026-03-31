package indexer

import (
	"path/filepath"
	"regexp"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func (this sqliteIndex) Search(path string, q string) ([]IFile, error) {
	files := []IFile{}
	rows, err := this.db.Query(
		"SELECT type, path, size, modTime FROM file WHERE path IN ("+
			"   SELECT path FROM file_index WHERE file_index MATCH ? AND path > ? AND path < ?"+
			"   ORDER BY rank LIMIT 50000"+
			")",
		regexp.MustCompile(`(\.|\-)`).ReplaceAllString(q, "\"$1\""),
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
