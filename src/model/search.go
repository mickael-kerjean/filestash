package model

import (
	"container/heap"
	"database/sql"
	"encoding/base64"
	"github.com/mattn/go-sqlite3"
	. "github.com/mickael-kerjean/filestash/src/common"
	"github.com/mickael-kerjean/filestash/src/model/formater"
	"hash/fnv"
	"io/ioutil"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	PHASE_EXPLORE      = "PHASE_EXPLORE"
	PHASE_INDEXING     = "PHASE_INDEXING"
	PHASE_MAINTAIN     = "PHASE_MAINTAIN"
	PHASE_PAUSE        = "PHASE_PAUSE"
	MAX_HEAP_SIZE      = 100000
)
var (
	SEARCH_ENABLE func() bool
	SEARCH_PROCESS_MAX func() int
	SEARCH_PROCESS_PAR func() int
	SEARCH_REINDEX func() int
	CYCLE_TIME func() int
	INDEXING_EXT func() string
	MAX_INDEXING_FSIZE func() int
	INDEXING_EXCLUSION = []string{"/node_modules/", "/bower_components/", "/.cache/", "/.npm/", "/.git/"}
)

var SProc SearchProcess = SearchProcess{
	idx: make([]SearchIndexer, 0),
	n:   -1,
}

func init(){
	SEARCH_ENABLE = func() bool {
		return Config.Get("features.search.enable").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Name = "enable"
			f.Type = "enable"
			f.Target = []string{"process_max", "process_par", "reindex_time", "cycle_time", "max_size", "indexer_ext"}
			f.Description = "Enable/Disable the search feature"
			f.Placeholder = "Default: false"
			f.Default = false
			return f
		}).Bool()
	}
	SEARCH_ENABLE()
	SEARCH_PROCESS_MAX = func() int {
		return Config.Get("features.search.process_max").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "process_max"
			f.Name = "process_max"
			f.Type = "number"
			f.Description = "Size of the pool containing the indexers"
			f.Placeholder = "Default: 5"
			f.Default = 5
			return f
		}).Int()
	}
	SEARCH_PROCESS_MAX()
	SEARCH_PROCESS_PAR = func() int {
		return Config.Get("features.search.process_par").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "process_par"
			f.Name = "process_par"
			f.Type = "number"
			f.Description = "How many concurrent indexers are running in the same time (requires a restart)"
			f.Placeholder = "Default: 2"
			f.Default = 2
			return f
		}).Int()
	}
	SEARCH_PROCESS_PAR()
	SEARCH_REINDEX = func() int {
		return Config.Get("features.search.reindex_time").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "reindex_time"
			f.Name = "reindex_time"
			f.Type = "number"
			f.Description = "Time in hours after which we consider our index to be stale and needs to be reindexed"
			f.Placeholder = "Default: 24h"
			f.Default = 24
			return f
		}).Int()
	}
	SEARCH_REINDEX()
	CYCLE_TIME = func() int {
		return Config.Get("features.search.cycle_time").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "cycle_time"
			f.Name = "cycle_time"
			f.Type = "number"
			f.Description = "Time the indexer needs to spend for each cycle in seconds (discovery, indexing and maintenance)"
			f.Placeholder = "Default: 10s"
			f.Default = 10
			return f
		}).Int()
	}
	CYCLE_TIME()
	MAX_INDEXING_FSIZE = func() int {
		return Config.Get("features.search.max_size").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "max_size"
			f.Name = "max_size"
			f.Type = "number"
			f.Description = "Maximum size of files the indexer will perform full text search"
			f.Placeholder = "Default: 524288000 => 512MB"
			f.Default = 524288000
			return f
		}).Int()
	}
	MAX_INDEXING_FSIZE()
	INDEXING_EXT = func() string {
		return Config.Get("features.search.indexer_ext").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Id = "indexer_ext"
			f.Name = "indexer_ext"
			f.Type = "string"
			f.Description = "File extension we want to see indexed"
			f.Placeholder = "Default: org,txt,docx,pdf,md,form"
			f.Default = "org,txt,docx,pdf,md,form"
			return f
		}).String()
	}
	INDEXING_EXT()

	onChange := Config.ListenForChange()
	runner := func() {
		startSearch := false
		for {
			if SEARCH_ENABLE() == false {
				select {
				case <- onChange.Listener: startSearch = SEARCH_ENABLE()
				}
				if startSearch == false {
					continue
				}
			}
			sidx := SProc.Peek()
			if sidx == nil {
				time.Sleep(5 * time.Second)
				continue
			}
			sidx.mu.Lock()
			sidx.Execute()
			sidx.mu.Unlock()
		}
	}
	for i:=0; i<SEARCH_PROCESS_PAR(); i++ {
		go runner()
	}
}

func Search(app *App, path string, keyword string) []File {
	var files []File = make([]File, 0)

	// extract our search indexer
	s := SProc.HintLs(app, path)
	if s == nil {
		return files
	}

	if path == "" {
		path = "/"
	}

	rows, err := s.DB.Query(
		"SELECT type, path, size, modTime FROM file WHERE path IN (" +
		"   SELECT path FROM file_index WHERE file_index MATCH ? AND path > ? AND path < ?" +
		"   ORDER BY rank LIMIT 2000" +
		")",
		regexp.MustCompile(`(\.|\-)`).ReplaceAllString(keyword, "\"$1\""),
		path, path + "~",
	)
	if err != nil {
		return files
	}
	defer rows.Close()
	for rows.Next() {
		f := File{}
		var t string
		if err = rows.Scan(&f.FType, &f.FPath, &f.FSize, &t); err != nil {
			Log.Warning("search::find search_error (%v)", err)
			return files
		}
		if tm, err := time.Parse(time.RFC3339, t); err == nil {
			f.FTime = tm.Unix() * 1000
		}
		f.FName = filepath.Base(f.FPath)
		files = append(files, f)
	}
	return files
}

type SearchProcess struct {
	idx []SearchIndexer
	n   int
	mu  sync.RWMutex
}

func(this *SearchProcess) HintLs(app *App, path string) *SearchIndexer {
	id := GenerateID(app)

	// try to find the search indexer among the existing ones
	this.mu.RLock()
	for i:=len(this.idx)-1; i>=0; i-- {
		if id == this.idx[i].Id {
			alreadyHasPath := false
			for j:=0; j<len(this.idx[i].FoldersUnknown); j++ {
				if this.idx[i].FoldersUnknown[j].Path == path {
					alreadyHasPath = true
					break
				}
			}
			if alreadyHasPath == false {
				heap.Push(&this.idx[i].FoldersUnknown, &Document{
					Type: "directory",
					Path: path,
					InitialPath: path,
					Name: filepath.Base(path),
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
	if lenIdx > 0 && search_process_max > 0 && lenIdx > ( search_process_max - 1) {
		toDel := this.idx[0 : lenIdx - ( search_process_max - 1)]
		for i := range toDel {
			toDel[i].DB.Close()
		}
		this.idx = this.idx[lenIdx - ( search_process_max - 1) :]
	}
	// instantiate the new indexer
	s := NewSearchIndexer(id, app.Backend)
	heap.Push(&s.FoldersUnknown, &Document{
		Type: "directory",
		Path: path,
		InitialPath: path,
		Name: filepath.Base(path),
	})
	this.idx = append(this.idx, s)
	this.mu.Unlock()
	return &s
}

func(this *SearchProcess) HintRm(app *App, path string) {
	id := GenerateID(app)
	this.mu.RLock()
	for i:=len(this.idx)-1; i>=0; i-- {
		if id == this.idx[i].Id {
			this.idx[i].DB.Exec("DELETE FROM file WHERE path >= ? AND path < ?", path, path + "~")
			break
		}
	}
	this.mu.RUnlock()
}

func(this *SearchProcess) HintFile(app *App, path string) {
	id := GenerateID(app)
	this.mu.RLock()
	for i:=len(this.idx)-1; i>=0; i-- {
		if id == this.idx[i].Id {
			this.idx[i].DB.Exec("UPDATE file set indexTime = NULL WHERE path = ?", path)
			break
		}
	}
	this.mu.RUnlock()
}


func(this *SearchProcess) Peek() *SearchIndexer {
	if len(this.idx) == 0 {
		return nil
	}
	this.mu.Lock()
	if this.n >= len(this.idx) - 1 || this.n < 0 {
		this.n = 0
	} else {
		this.n = this.n + 1
	}
	s := &this.idx[this.n]
	this.mu.Unlock()
	return s
}

func(this *SearchProcess) Reset() {
	this.mu.Lock()
	for i := range this.idx {
		this.idx[i].DB.Close()
	}
	this.idx = make([]SearchIndexer, 0)
	this.mu.Unlock()
	this.n = -1
}

type SearchIndexer struct {
	Id             string
	FoldersUnknown HeapDoc
	CurrentPhase   string
	Backend        IBackend
	DBPath         string
	DB             *sql.DB
	mu             sync.Mutex
	lastHash       string
}

func NewSearchIndexer(id string, b IBackend) SearchIndexer {
	s := SearchIndexer {
		DBPath:  filepath.Join(GetCurrentDir(), FTS_PATH, "fts_" + id + ".sql"),
		Id:      id,
		Backend: b,
		FoldersUnknown: make(HeapDoc, 0, 1),
	}
	heap.Init(&s.FoldersUnknown)

	db, err := sql.Open("sqlite3", s.DBPath + "?_journal_mode=wal")
	if err != nil {
		Log.Warning("search::init can't open database (%v)", err)
		return s
	}
	s.DB = db
	queryDB := func(sqlQuery string) error {
		stmt, err := db.Prepare(sqlQuery);
		if err != nil {
			Log.Warning("search::initschema prepare schema error(%v)", err)
			return err
		}
		defer stmt.Close()
		_, err = stmt.Exec()
		if err != nil {
			Log.Warning("search::initschema execute error(%v)", err)
			return err
		}
		return err
	}
	if queryDB("CREATE TABLE IF NOT EXISTS file(path VARCHAR(1024) PRIMARY KEY, filename VARCHAR(64), filetype VARCHAR(16), type VARCHAR(16), parent VARCHAR(1024), size INTEGER, modTime timestamp, indexTime timestamp DEFAULT NULL);"); err != nil {
		return s
	}
	if queryDB("CREATE INDEX IF NOT EXISTS idx_file_index_time ON file(indexTime) WHERE indexTime IS NOT NULL;"); err != nil {
		return s
	}
	if queryDB("CREATE INDEX IF NOT EXISTS idx_file_parent ON file(parent);"); err != nil {
		return s
	}
	if queryDB("CREATE VIRTUAL TABLE IF NOT EXISTS file_index USING fts5(path UNINDEXED, filename, filetype, content, tokenize = 'porter');"); err != nil {
		return s
	}
	if queryDB("CREATE TRIGGER IF NOT EXISTS after_file_insert AFTER INSERT ON file BEGIN INSERT INTO file_index (path, filename, filetype) VALUES(new.path, new.filename, new.filetype); END;"); err != nil {
		return s
	}
	if queryDB("CREATE TRIGGER IF NOT EXISTS after_file_delete AFTER DELETE ON file BEGIN DELETE FROM file_index WHERE path = old.path; END;"); err != nil {
		return s
	}
	if queryDB("CREATE TRIGGER IF NOT EXISTS after_file_update_path UPDATE OF path ON file BEGIN UPDATE file_index SET path = new.path, filepath = new.filepath, filetype = new.filetype WHERE path = old.path; END;"); err != nil {
		return s
	}
	return s
}

func(this *SearchIndexer) Execute(){
	if this.CurrentPhase == "" {
		time.Sleep(1 * time.Second)
		this.CurrentPhase = PHASE_EXPLORE
	}
	Log.Debug("Search::indexing Execute %s", this.CurrentPhase)

	cycleExecute := func(fn func(*sql.Tx) bool) {
		stopTime := time.Now().Add(time.Duration(CYCLE_TIME()) * time.Second)
		tx, err := this.DB.Begin()
		if err != nil {
			Log.Warning("search::index cycle_begin (%+v)", err)
			time.Sleep(5 * time.Second)
		}
		for {
			if fn(tx) == false {
				break
			}
			if stopTime.After(time.Now()) == false {
				break
			}
		}
		if err = tx.Commit(); err != nil {
			Log.Warning("search::index cycle_commit (%+v)", err)
		}
	}
	if this.CurrentPhase == PHASE_EXPLORE {
		cycleExecute(this.Discover)
		return
	} else if this.CurrentPhase == PHASE_INDEXING {
		cycleExecute(this.Indexing)
		return
	} else if this.CurrentPhase == PHASE_MAINTAIN {
		cycleExecute(this.Consolidate)
		return
	} else if this.CurrentPhase == PHASE_PAUSE {
		time.Sleep(5 * time.Second)
		this.CurrentPhase = ""
	}
	return
}

func(this *SearchIndexer) Discover(tx *sql.Tx) bool {
	if this.FoldersUnknown.Len() == 0 {
		this.CurrentPhase = PHASE_INDEXING
		return false
	}
	var doc *Document
	doc = heap.Pop(&this.FoldersUnknown).(*Document)
	if doc == nil {
		this.CurrentPhase = PHASE_INDEXING
		return false
	}
	files, err := this.Backend.Ls(doc.Path)
	if err != nil {
		this.CurrentPhase = ""
		return true
	}
	if len(files) == 0 {
		return true
	}

	// We don't want our indexer to go wild and diverge over time. As such we need to detect those edge cases: aka
	// recursive folder structure. Our detection is relying on a Hash of []os.FileInfo
	hashFiles := func() string {
		var step int = len(files) / 50
		if step == 0 {
			step = 1
		}
		hasher := fnv.New32()
		hasher.Write([]byte(strconv.Itoa(len(files))))
		for i:=0; i<len(files); i = i+step {
			hasher.Write([]byte(files[i].Name()))
		}
		return base64.StdEncoding.EncodeToString(hasher.Sum(nil))
	}()
	if hashFiles == this.lastHash {
		return true
	}
	this.lastHash = ""
	for i:=0; i<this.FoldersUnknown.Len(); i++ {
		if this.FoldersUnknown[i].Hash == hashFiles && filepath.Base(doc.Path) != filepath.Base(this.FoldersUnknown[i].Path) {
			this.lastHash = hashFiles
			return true
		}
	}

	// Insert the newly found data within our index
	for i := range files {
		f := files[i]
		name := f.Name()
		if f.IsDir() {
			var performPush bool = false
			p := filepath.Join(doc.Path, name)
			p += "/"
			if err = this.dbInsert(doc.Path, f, tx); err == nil {
				performPush = true
			} else if e, ok := err.(sqlite3.Error); ok && e.Code == sqlite3.ErrConstraint {
				performPush = func(path string) bool{
					var t string
					var err error
					if err := tx.QueryRow("SELECT indexTime FROM file WHERE path = ?", p).Scan(&t); err != nil {
						Log.Warning("search::discovery unknown_path (%v)", err)
						return false
					}
					tm, err := time.Parse(time.RFC3339, t)
					if err != nil {
						Log.Warning("search::discovery invalid_time (%v)", err)
						return false
					}
					if time.Now().Add(time.Duration(- SEARCH_REINDEX()) * time.Hour).Before(tm) {
						return false
					}
					if _, err = tx.Exec("UPDATE file SET indexTime = ? WHERE path = ?", time.Now(), p); err != nil {
						Log.Warning("search::discovery insertion_failed (%v)", err)
						return false
					}
					return true
				}(p)
			} else {
				Log.Error("search::indexing insert_index (%v)", err)
			}
			if performPush == true {
				heap.Push(&this.FoldersUnknown, &Document{
					Type: "directory",
					Name: name,
					Path: p,
					Size: f.Size(),
					ModTime: f.ModTime(),
					Hash: hashFiles,
				})
			}
		} else {
			if err = this.dbInsert(doc.Path, f, tx); err != nil {
				if e, ok := err.(sqlite3.Error); ok && e.Code == sqlite3.ErrConstraint {
					return false
				}
				Log.Warning("search::insert index_error (%v)", err)
				return false
			}
		}
	}
	return true
}

func(this *SearchIndexer) Indexing(tx *sql.Tx) bool {
	ext := strings.Split(INDEXING_EXT(), ",")
	for i:=0; i<len(ext); i++ {
		ext[i] = "'" + strings.TrimSpace(ext[i]) + "'"
	}

	rows, err := tx.Query(
		"SELECT path FROM file WHERE (" +
		"  type = 'file' AND size < ? AND filetype IN (" + strings.Join(ext, ",") +") AND indexTime IS NULL " +
		") LIMIT 2",
		MAX_INDEXING_FSIZE(),
	)
	if err != nil {
		Log.Warning("search::insert index_query (%v)", err)
		return false
	}
	defer rows.Close()
	i := 0
	for rows.Next() {
		i += 1
		var path string
		if err = rows.Scan(&path); err != nil {
			Log.Warning("search::indexing index_scan (%v)", err)
			return false
		}
		if err = this.updateFile(path, tx); err != nil {
			Log.Warning("search::indexing index_update (%v)", err)
			return false
		}
	}

	if i == 0 {
		this.CurrentPhase = PHASE_MAINTAIN
		return false
	}
	return true
}

func(this *SearchIndexer) updateFile(path string, tx *sql.Tx) error {
	if _, err := tx.Exec("UPDATE file SET indexTime = ? WHERE path = ?", time.Now(), path); err != nil {
		return err
	}

	for i:=0; i<len(INDEXING_EXCLUSION); i++ {
		if strings.Contains(path, INDEXING_EXCLUSION[i]) {
			return nil
		}
	}

	reader, err := this.Backend.Cat(path)
	if err != nil {
		if _, a := tx.Exec("DELETE FROM file WHERE path = ?", path); a != nil {
			return a
		}
		return err
	}
	defer reader.Close()

	switch GetMimeType(path) {
	case "text/plain": reader, err = formater.TxtFormater(reader)
	case "text/org": reader, err = formater.TxtFormater(reader)
	case "text/markdown": reader, err = formater.TxtFormater(reader)
	case "application/x-form": reader, err = formater.TxtFormater(reader)
	case "application/pdf": reader, err = formater.PdfFormater(reader)
	case "application/powerpoint": reader, err = formater.OfficeFormater(reader)
	case "application/vnd.ms-powerpoint": reader, err = formater.OfficeFormater(reader)
	case "application/word": reader, err = formater.OfficeFormater(reader)
	case "application/msword": reader, err = formater.OfficeFormater(reader)
	default: return nil
	}

	if err != nil {
		return nil
	}
	var content []byte
	if content, err = ioutil.ReadAll(reader); err != nil {
		Log.Warning("search::index content_read (%v)", err)
		return nil
	}
	if _, err = tx.Exec("UPDATE file_index SET content = ? WHERE path = ?", content, path); err != nil {
		Log.Warning("search::index index_update (%v)", err)
		return err
	}
	return nil
}

func(this *SearchIndexer) updateFolder(path string, tx *sql.Tx) error {
	if _, err := tx.Exec("UPDATE file SET indexTime = ? WHERE path = ?", time.Now(), path); err != nil {
		return err
	}

	for i:=0; i<len(INDEXING_EXCLUSION); i++ {
		if strings.Contains(path, INDEXING_EXCLUSION[i]) {
			return nil
		}
	}

	// Fetch list of folders as in the remote filesystem
	currFiles, err := this.Backend.Ls(path)
	if err != nil {
		tx.Exec("DELETE FROM file WHERE path >= ? AND path < ?", path, path + "~")
		return err
	}

	// Fetch FS as appear in our search cache
	rows, err := tx.Query("SELECT filename, type, size FROM file WHERE parent = ?", path)
	if err != nil {
		return err
	}
	defer rows.Close()
	previousFiles := make([]File, 0)
	for rows.Next() {
		var f File
		rows.Scan(&f.FName, &f.FType, f.FSize)
		previousFiles = append(previousFiles, f)
	}

	// Perform the DB operation to ensure previousFiles and currFiles are in sync
	// 1. Find the content that have been created and did not exist before
	for i:=0; i<len(currFiles); i++ {
		currFilenameAlreadyExist := false
		currFilename := currFiles[i].Name()
		for j:=0; j<len(previousFiles); j++ {
			if currFilename == previousFiles[j].Name() {
				if currFiles[i].Size() != previousFiles[j].Size() {
					err = this.dbUpdate(path, currFiles[i], tx)
					if err != nil {
						return err
					}
					break
				}
				currFilenameAlreadyExist = true
				break
			}
		}
		if currFilenameAlreadyExist == false {
			this.dbInsert(path, currFiles[i], tx)
		}
	}
	// 2. Find the content that was existing before but got removed
	for i:=0; i<len(previousFiles); i++ {
		previousFilenameStillExist := false
		previousFilename := previousFiles[i].Name()
		for j:=0; j<len(currFiles); j++ {
			if previousFilename == currFiles[j].Name() {
				previousFilenameStillExist = true
				break
			}
		}
		if previousFilenameStillExist == false {
			this.dbDelete(path, previousFiles[i], tx)
		}
	}
	return nil
}

func(this *SearchIndexer) Consolidate(tx *sql.Tx) bool {
	rows, err := tx.Query(
		"SELECT path, type FROM file WHERE indexTime < ? ORDER BY indexTime DESC LIMIT 5",
		time.Now().Add(- time.Duration(SEARCH_REINDEX()) * time.Hour),
	)
	if err != nil {
		if err == sql.ErrNoRows {
			this.CurrentPhase = PHASE_PAUSE
			return false
		}
		this.CurrentPhase = ""
		return false
	}
	defer rows.Close()
	i := 0
	for rows.Next() {
		i += 1
		var path string
		var cType string
		if err = rows.Scan(&path, &cType); err != nil {
			Log.Warning("search::index db_stale (%v)", err)
			return false
		}
		if cType == "directory" {
			this.updateFolder(path, tx)
		} else {
			this.updateFile(path, tx)
		}
	}
	if i == 0 {
		this.CurrentPhase = PHASE_PAUSE
		return false
	}
	return true
}

func(this *SearchIndexer) dbInsert(parent string, f os.FileInfo, tx *sql.Tx) error {
	var name string = f.Name()
	var err error
	path := filepath.Join(parent, name)

	if f.IsDir() {
		_, err = tx.Exec(
			"INSERT INTO file(path, parent, filename, type, size, modTime, indexTime) " +
			"VALUES(?, ?, ?, ?, ?, ?, ?)",
			path + "/",
			parent,
			name,
			"directory",
			f.Size(),
			f.ModTime(),
			time.Now(),
		)
	} else {
		_, err = tx.Exec(
			"INSERT INTO file(path, parent, filename, type, size, modTime, indexTime, filetype) " +
			"VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
			path,
			parent,
			name,
			"file",
			f.Size(),
			f.ModTime(),
			nil,
			strings.TrimPrefix(filepath.Ext(name), "."),
		)
	}
	return err
}

func(this *SearchIndexer) dbUpdate(parent string, f os.FileInfo, tx *sql.Tx) error {
	path := filepath.Join(parent, f.Name())
	if f.IsDir() {
		path += "/"
	}
	_, err := tx.Exec(
		"UPDATE file SET size = ?, modTime = ? indexTime = NULL WHERE path = ?",
		f.Size(), f.ModTime(), path,
	)
	return err
}

func(this *SearchIndexer) dbDelete(parent string, f os.FileInfo, tx *sql.Tx) error {
	path := filepath.Join(parent, f.Name())
	if f.IsDir() {
		path += "/"
	}
	_, err := tx.Exec(
		"DELETE FROM file WHERE path >= ? AND path < ?",
		path, path + "~",
	)
	return err
}

type Document struct {
	Hash        string    `json:"-"`
	Type        string    `json:"type"`
	Name        string    `json:"name"`
	Path        string    `json:"path"`
	InitialPath string    `json:"-"`
	Ext         string    `json:"ext"`
	ModTime     time.Time `json:"time"`
	Size        int64     `json:"size"`
	Content     []byte    `json:"content"`
	Priority    int       `json:"-"`
}

// https://golang.org/pkg/container/heap/
type HeapDoc []*Document
func(h HeapDoc) Len() int { return len(h) }
func(h HeapDoc) Less(i, j int) bool {
	if h[i].Priority != 0 || h[j].Priority != 0 {
		return h[i].Priority < h[j].Priority
	}
	scoreA := len(strings.Split(h[i].Path, "/")) / len(strings.Split(h[i].InitialPath, "/"))
	scoreB := len(strings.Split(h[j].Path, "/")) / len(strings.Split(h[j].InitialPath, "/"))
	return scoreA < scoreB
}
func(h HeapDoc) Swap(i, j int) {
	a := h[i]
	h[i] = h[j]
	h[j] = a
}
func (h *HeapDoc) Push(x interface{}) {
	if h.Len() < MAX_HEAP_SIZE {
		*h = append(*h, x.(*Document))
	}
}
func (h *HeapDoc) Pop() interface{} {
	old := *h
	n := len(old)
	if n == 0 {
		return nil
	}
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}
