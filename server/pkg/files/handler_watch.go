package files

import (
	"container/ring"
	"strings"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

var (
	feed = ring.New(1000)
	flock = sync.Mutex{}
	fdrop = atomic.Uint64{}
)

func init() {
	t := time.Now().UTC()
	for i := 0; i < feed.Len(); i++ {
  		feed.Value = change{Time: t}
  		feed = feed.Next()
  	}
}

type change struct {
	Echo      bool      `json:"echo"`
	Path      string    `json:"path"`
	StorageID string    `json:"-"`
	Time      time.Time `json:"-"`
	UserAgent string    `json:"-"`
}

func FileWatch(ctx *App, res http.ResponseWriter, req *http.Request) {
	flusher, ok := res.(http.Flusher)
	if !ok {
		SendErrorResult(res, NewError("streaming not supported", 500))
		return
	}
	since, err := time.Parse(time.RFC3339, req.Header.Get("Last-Event-ID"))
	if err != nil {
		since = time.Now()
	}
	currentDrop := uint64(0)
	ticker := time.NewTimer(0)
	defer ticker.Stop()
	storageID := GenerateID(ctx.Session)
	userAgent := req.Header.Get("User-Agent")
	res.Header().Set("Content-Type", "text/event-stream")
	res.Header().Set("Cache-Control", "no-cache")
	res.Header().Set("Connection", "keep-alive")

	for {
		select {
		case <-req.Context().Done():
			return
		case <-ticker.C:
			flock.Lock()
			t := feed.Value.(change).Time
			if nDrop := fdrop.Load(); currentDrop != nDrop {
				t = time.Now().UTC()
				fmt.Fprintf(res, "id: %s\nevent: purge\ndata: {}\n\n", t.Format(time.RFC3339Nano))
				since = t
				currentDrop = nDrop
			} else if since.Before(t) {
				fmt.Fprintf(res, "id: %s\nevent: purge\ndata: {}\n\n", t.Format(time.RFC3339Nano))
				since = t
			}
			feed.Do(func(p any) {
				el := p.(change)
				el.Echo = el.UserAgent == userAgent
				el.Path = strings.TrimPrefix(el.Path, ctx.Session["path"])
				if el.StorageID != storageID {
					return
				} else if since.Equal(el.Time) || since.After(el.Time) {
					return
				}
				data, _ := json.Marshal(el)
				fmt.Fprintf(res, "id: %s\nevent: dirty\ndata: %s\n\n", el.Time.Format(time.RFC3339Nano), data)
				since = el.Time
			})
			flock.Unlock()
			flusher.Flush()
			ticker.Reset(5 * time.Second)
		}
	}
}

func markDirty(ctx *App, req *http.Request, fullpath string) {
	if !flock.TryLock() {
		Log.Debug("ls::watch message=cannot_lock_feed", )
		fdrop.Add(1)
		return
	}
	path, _ := SplitPath(fullpath)
	cVal := change{
		Path:      path,
		StorageID: GenerateID(ctx.Session),
		Time:      time.Now().UTC(),
		UserAgent: req.Header.Get("User-Agent"),
	}
	pVal := feed.Prev().Value.(change)
	if pVal.StorageID == cVal.StorageID && pVal.Path == cVal.Path && pVal.UserAgent == cVal.UserAgent {
		feed = feed.Prev()
	}
	feed.Value = cVal
	feed = feed.Next()
	flock.Unlock()
}
