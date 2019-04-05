package model

import (
	"container/heap"
	"database/sql"
	"encoding/base64"
	"github.com/mattn/go-sqlite3"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model/formater"
	"hash/fnv"
	"io"
	"math/rand"
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
)
var (
	SEARCH_ENABLE func() bool
	SEARCH_PROCESS_MAX func() int
	SEARCH_PROCESS_PAR func() int
	SEARCH_REINDEX func() int
	CYCLE_TIME func() int
	MAX_INDEXING_FSIZE func() int
	INDEXING_EXT func() string
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
		return 1
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
			f.Placeholder = "Default: org,txt,docx,pdf,md"
			f.Default = "/"
			return f
		}).String()
	}
	INDEXING_EXT()

	runner := func() {
		for {
			if SEARCH_ENABLE() == false {
				time.Sleep(60 * time.Second)
				continue
			}
			sidx := SProc.Peek()
			if sidx == nil {
				time.Sleep(5 * time.Second)
				continue
			} else if sidx.FoldersUnknown.Len() == 0 {
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
	s := SProc.Append(app, path)
	if s == nil {
		return files
	}

	if path == "" {
		path = "/"
	}

	rows, err := s.db.Query(
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
	mu  sync.Mutex
}

func(this *SearchProcess) Append(app *App, path string) *SearchIndexer {
	id := GenerateID(app)
	this.mu.Lock()
	defer this.mu.Unlock()

	// try to find the search indexer among the existing ones
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
			return &this.idx[i]
		}
	}

	// Having all indexers running in memory could be expensive => instead we're cycling a pool
	search_process_max := 2//SEARCH_PROCESS_MAX()
	if len(this.idx) > ( search_process_max - 1) {
		toDel := this.idx[0 : len(this.idx) - ( search_process_max - 1)]
		for i := range toDel {
			toDel[i].db.Close()
		}
		this.idx = this.idx[len(this.idx) - ( search_process_max - 1) :]
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
	return &s
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


type SearchIndexer struct {
	Id             string
	FoldersUnknown HeapDoc
	FilesUnknown   HeapDoc
	Backend        IBackend
	db             *sql.DB
	mu             sync.Mutex
}

func NewSearchIndexer(id string, b IBackend) SearchIndexer {
	s := SearchIndexer {
		Id:      id,
		Backend: b,
		FoldersUnknown: make(HeapDoc, 0, 1),
		FilesUnknown:   make(HeapDoc, 0, 1),
	}
	heap.Init(&s.FoldersUnknown)
	heap.Init(&s.FilesUnknown)

	db, err := sql.Open("sqlite3", filepath.Join(GetCurrentDir(), FTS_PATH, "fts_" + id + ".sql"))
	if err != nil {
		Log.Warning("search::init can't open database (%v)", err)
		return s
	}
	queryDB := func(sqlQuery string) error {
		stmt, err := db.Prepare(sqlQuery);
		if err != nil {
			Log.Warning("search::initschema prepare schema error(%v)", err)
			return err
		}
		_, err = stmt.Exec()
		if err != nil {
			Log.Warning("search::initschema execute error(%v)", err)
			return err
		}
		return err
	}
	if queryDB("CREATE TABLE IF NOT EXISTS file(path VARCHAR(1024) PRIMARY KEY, filename VARCHAR(64), filetype VARCHAR(16), type VARCHAR(16), size INTEGER, modTime timestamp, indexTime timestamp DEFAULT NULL);"); err != nil {
		return s
	}
	if queryDB("CREATE VIRTUAL TABLE IF NOT EXISTS file_index USING fts5(path UNINDEXED, filename, filetype, content);"); err != nil {
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
	s.db = db
	return s
}

func(this *SearchIndexer) Execute(){
	currentPhase := func() string {
		if len(this.FoldersUnknown) != 0 {
			return PHASE_EXPLORE
		}
		if len(this.FilesUnknown) != 0 {
			return PHASE_INDEXING
		}
		return PHASE_MAINTAIN
	}()
	cycleExecute := func(fn func() bool) {
		stopTime := time.Now().Add(time.Duration(CYCLE_TIME()) * time.Second)
		for {
			if fn() == false {
				break
			}
			if stopTime.After(time.Now()) == false {
				break
			}
		}
	}
	if currentPhase == PHASE_EXPLORE {
		cycleExecute(this.Discover)
		return
	} else if currentPhase == PHASE_INDEXING {
		r := rand.Intn(100)
		if r < 30 {
			cycleExecute(this.Bookkeeping)
			return
		}
		cycleExecute(this.Indexing)
		return
	} else if currentPhase == PHASE_MAINTAIN {
		cycleExecute(this.Bookkeeping)
		return
	}
	return
}

func(this *SearchIndexer) Discover() bool {
	if this.FoldersUnknown.Len() == 0 {
		return false
	}
	doc := heap.Pop(&this.FoldersUnknown).(*Document)
	if doc == nil {
		return false
	}
	files, err := this.Backend.Ls(doc.Path)
	if err != nil {
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
	for i:=0; i<this.FoldersUnknown.Len(); i++ {
		if this.FoldersUnknown[i].Hash == hashFiles && filepath.Base(doc.Path) != filepath.Base(this.FoldersUnknown[i].Path) {
			return true
		}
	}

	// Insert the newly found data within our index
	tx, _ := this.db.Begin()
	tx.Exec("BEGIN EXCLUSIVE TRANSACTION;")
	for i := range files {
		f := files[i]
		name := f.Name()
		p := filepath.Join(doc.Path, name)
		if f.IsDir() {
			p += "/"
			_, err = tx.Exec(
				"INSERT INTO file(path, filename, type, size, modTime, indexTime) VALUES(?, ?, ?, ?, ?, ?)",
				p,
				name,
				"directory",
				f.Size(),
				f.ModTime(),
				time.Now(),
			);
			var performPush bool = false
			if err == nil {
				performPush = true
			} else if e, ok := err.(sqlite3.Error); ok && e.Code == sqlite3.ErrConstraint {
				performPush = func(path string) bool{
					var t string
					var err error
					if err := tx.QueryRow("SELECT indexTime FROM file WHERE path = ?", p).Scan(&t); err != nil {
						Log.Warning("search::discovery unknown_path (%v)", err)
						return false
					}
					tm, err := time.Parse(time.RFC3339, t);
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
			_, err = tx.Exec(
				"INSERT INTO file(path, filename, filetype, type, size, modTime) VALUES(?, ?, ?, ?, ?, ?)",
				filepath.Join(doc.Path, name),
				name,
				strings.TrimPrefix(filepath.Ext(name), "."),
				"file",
				f.Size(),
				f.ModTime(),
			)
		}
	}
	err = tx.Commit()
	if err != nil {
		Log.Warning("search::discovery transaction_error (%v)", err)
		return false
	}
	return true
}

func(this *SearchIndexer) Indexing() bool {
	var path string
	// find some file that needs to be indexed
	var err error
	if err = this.db.QueryRow(
		"SELECT path FROM file WHERE (" +
		"  type = 'file' AND size < 512000 AND filetype = 'txt' AND indexTime IS NULL" +
		") LIMIT 1;",
	).Scan(&path); err != nil {
		return false
	}
	defer this.db.Exec(
		"UPDATE file SET indexTime = ? WHERE path = ?",
		time.Now(), path,
	)
	mime := GetMimeType(path)

	// Index content
	var reader io.ReadCloser
	reader, err = this.Backend.Cat(path)
	if err != nil {
		return false
	}
	defer reader.Close()
	switch mime {
	case "text/plain": reader, err = formater.TxtFormater(reader)
	case "text/org": reader, err = formater.TxtFormater(reader)
	case "text/markdown": reader, err = formater.TxtFormater(reader)
	case "application/pdf": reader, err = formater.PdfFormater(reader)
	case "application/powerpoint": reader, err = formater.OfficeFormater(reader)
	case "application/vnd.ms-powerpoint": reader, err = formater.OfficeFormater(reader)
	case "application/word": reader, err = formater.OfficeFormater(reader)
	case "application/msword": reader, err = formater.OfficeFormater(reader)
	default: return true
	}
	if err != nil {
		Log.Warning("search::indexing formater_error (%v)", err)
		return true
	}
	return true
}

func(this SearchIndexer) Bookkeeping() bool {
	return false
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
}

// https://golang.org/pkg/container/heap/
type HeapDoc []*Document
func(h HeapDoc) Len() int { return len(h) }
func(h HeapDoc) Less(i, j int) bool {
	scoreA := len(strings.Split(h[i].Path, "/")) / len(strings.Split(h[i].InitialPath, "/"))
	scoreB := len(strings.Split(h[j].Path, "/")) / len(strings.Split(h[j].InitialPath, "/"))
	return scoreA < scoreB
}
func(h HeapDoc) Swap(i, j int) {
	a := h[i]
	h[i] = h[j]
	h[j] = a
}
func (h *HeapDoc) Push(x interface{}) { *h = append(*h, x.(*Document)) }
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
