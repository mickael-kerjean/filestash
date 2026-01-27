package indexer

import (
	"database/sql"
	"io"
	"io/fs"
	"path/filepath"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

type Index interface {
	Init() error
	Search(path string, q string) ([]IFile, error)
	Change() (Manager, error)
	Close() error
}

type Manager interface {
	FindParent(path string) (RowMapper, error)
	FindBefore(time time.Time) (RowMapper, error)
	FindNew(maxSize int, toOmit []string) (RowMapper, error)

	FileCreate(f fs.FileInfo, parent string) error
	FileContentUpdate(path string, f io.ReadCloser) error
	FileMetaUpdate(path string, f fs.FileInfo) error

	IndexTimeGet(path string) (time.Time, error)
	IndexTimeUpdate(path string, t time.Time) error
	IndexTimeClear(path string) error

	RemoveAll(path string) error
	Commit() error
}

func NewIndex(id string) Index {
	return &sqliteIndex{id, nil}
}

type sqliteIndex struct {
	id string
	db *sql.DB
}

func (this *sqliteIndex) Init() error {
	path := GetAbsolutePath(FTS_PATH, "fts_"+this.id+".sql")
	db, err := sql.Open("sqlite3", path+"?_journal_mode=wal")
	if err != nil {
		Log.Warning("search::init can't open database (%v)", err)
		return toErr(err)
	}
	this.db = db

	queryDB := func(sqlQuery string) error {
		stmt, err := db.Prepare(sqlQuery)
		if err != nil {
			Log.Warning("search::initschema prepare schema error(%v)", err)
			return toErr(err)
		}
		defer stmt.Close()
		_, err = stmt.Exec()
		if err != nil {
			Log.Warning("search::initschema execute error(%v)", err)
			return toErr(err)
		}
		return nil
	}
	if queryDB("CREATE TABLE IF NOT EXISTS file(path VARCHAR(1024) PRIMARY KEY, filename VARCHAR(64), filetype VARCHAR(16), type VARCHAR(16), parent VARCHAR(1024), size INTEGER, modTime timestamp, indexTime timestamp DEFAULT NULL);"); err != nil {
		return err
	}
	if queryDB("CREATE INDEX IF NOT EXISTS idx_file_index_time ON file(indexTime) WHERE indexTime IS NOT NULL;"); err != nil {
		return err
	}
	if queryDB("CREATE INDEX IF NOT EXISTS idx_file_parent ON file(parent);"); err != nil {
		return err
	}
	if queryDB("CREATE VIRTUAL TABLE IF NOT EXISTS file_index USING fts5(path UNINDEXED, filename, filetype, content, tokenize = 'porter');"); err != nil {
		return err
	}
	if queryDB("CREATE TRIGGER IF NOT EXISTS after_file_insert AFTER INSERT ON file BEGIN INSERT INTO file_index (path, filename, filetype) VALUES(new.path, new.filename, new.filetype); END;"); err != nil {
		return err
	}
	if queryDB("CREATE TRIGGER IF NOT EXISTS after_file_delete AFTER DELETE ON file BEGIN DELETE FROM file_index WHERE path = old.path; END;"); err != nil {
		return err
	}
	if queryDB("CREATE TRIGGER IF NOT EXISTS after_file_update_path UPDATE OF path ON file BEGIN UPDATE file_index SET path = new.path, filename = new.filename, filetype = new.filetype WHERE path = old.path; END;"); err != nil {
		return err
	}
	return nil
}

func (this sqliteIndex) Change() (Manager, error) {
	tx, err := this.db.Begin()
	if err != nil {
		return nil, toErr(err)
	}
	return sqliteQueries{tx}, nil
}

func (this sqliteIndex) Close() error {
	return this.db.Close()
}

type sqliteQueries struct {
	tx *sql.Tx
}

func (this sqliteQueries) Commit() error {
	return this.tx.Commit()
}

func (this sqliteQueries) IndexTimeGet(path string) (time.Time, error) {
	var t string
	if err := this.tx.QueryRow("SELECT indexTime FROM file WHERE path = ?", path).Scan(&t); err != nil {
		return time.Now(), toErr(err)
	}
	tm, err := time.Parse(time.RFC3339, t)
	if err != nil {
		return tm, toErr(err)
	}
	return tm, nil
}

func (this sqliteQueries) IndexTimeUpdate(path string, time time.Time) error {
	if _, err := this.tx.Exec("UPDATE file SET indexTime = ? WHERE path = ?", time, path); err != nil {
		return toErr(err)
	}
	return nil
}

func (this sqliteQueries) IndexTimeClear(path string) error {
	if _, err := this.tx.Exec("UPDATE file SET indexTime = NULL WHERE path = ?", path); err != nil {
		return toErr(err)
	}
	return nil
}

type Record struct {
	Name  string
	Path  string
	Size  int64
	CType string
}

type RowMapper struct {
	rows *sql.Rows
}

func (this *RowMapper) Next() bool {
	return this.rows.Next()
}

func (this *RowMapper) Value() (Record, error) {
	var r Record
	if err := this.rows.Scan(&r.Name, &r.CType, &r.Path, &r.Size); err != nil {
		return r, toErr(err)
	}
	return r, nil
}

func (this *RowMapper) Close() error {
	return this.rows.Close()
}

func (this sqliteQueries) FindNew(maxSize int, toOmit []string) (RowMapper, error) {
	for i := 0; i < len(toOmit); i++ {
		toOmit[i] = "'" + strings.TrimSpace(toOmit[i]) + "'"
	}

	rows, err := this.tx.Query(
		"SELECT filename, type, path, size FROM file WHERE ("+
			"  type = 'file' AND size < ? AND filetype IN ("+strings.Join(toOmit, ",")+") AND indexTime IS NULL "+
			") LIMIT 2",
		maxSize,
	)
	if err != nil {
		return RowMapper{}, toErr(err)
	}
	return RowMapper{rows: rows}, nil
}

func (this sqliteQueries) FindBefore(t time.Time) (RowMapper, error) {
	rows, err := this.tx.Query(
		"SELECT filename, type, path, size FROM file WHERE indexTime < ? ORDER BY indexTime DESC LIMIT 5",
		t,
	)
	if err != nil {
		return RowMapper{}, toErr(err)
	}
	return RowMapper{rows: rows}, nil
}

func (this sqliteQueries) FindParent(path string) (RowMapper, error) {
	rows, err := this.tx.Query("SELECT filename, type, path, size FROM file WHERE parent = ?", path)
	if err != nil {
		return RowMapper{}, err
	}
	return RowMapper{rows: rows}, nil
}

func (this sqliteQueries) FileMetaUpdate(path string, f fs.FileInfo) error {
	_, err := this.tx.Exec(
		"UPDATE file SET size = ?, modTime = ? indexTime = NULL WHERE path = ?",
		f.Size(), f.ModTime(), path,
	)
	return toErr(err)
}

func (this sqliteQueries) FileContentUpdate(path string, reader io.ReadCloser) error {
	content, err := io.ReadAll(reader)
	if err != nil {
		return toErr(err)
	}
	if _, err := this.tx.Exec("UPDATE file_index SET content = ? WHERE path = ?", content, path); err != nil {
		return toErr(err)
	}
	return nil
}

func (this sqliteQueries) FileCreate(f fs.FileInfo, parentPath string) (err error) {
	name := f.Name()
	path := filepath.Join(parentPath, f.Name())
	if f.IsDir() {
		_, err = this.tx.Exec(
			"INSERT INTO file(path, parent, filename, type, size, modTime, indexTime) "+
				"VALUES(?, ?, ?, ?, ?, ?, ?)",
			path+"/",
			parentPath,
			name,
			"directory",
			f.Size(),
			f.ModTime(),
			time.Now(),
		)
	} else {
		_, err = this.tx.Exec(
			"INSERT INTO file(path, parent, filename, type, size, modTime, indexTime, filetype) "+
				"VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
			path,
			parentPath,
			name,
			"file",
			f.Size(),
			f.ModTime(),
			nil,
			strings.TrimPrefix(filepath.Ext(name), "."),
		)
	}
	return toErr(err)
}

func (this sqliteQueries) Remove(path string) error {
	if _, a := this.tx.Exec("DELETE FROM file WHERE path = ?", path); a != nil {
		return toErr(a)
	}
	return nil
}

func (this sqliteQueries) RemoveAll(path string) error {
	if _, a := this.tx.Exec("DELETE FROM file WHERE path >= ? AND path < ?", path, path+"~"); a != nil {
		return toErr(a)
	}
	return nil
}
