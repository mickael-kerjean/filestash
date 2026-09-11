package files

import (
	"container/ring"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

var (
	journal = ring.New(5000)
	gate    = sync.NewCond(&sync.Mutex{})
)

func init() {
	t := time.Now().UTC()
	for i := 0; i < journal.Len(); i++ {
		journal.Value = mutation{Time: t}
		journal = journal.Next()
	}
}

type mutation struct {
	Operation string    `json:"operation"`
	Path      string    `json:"path"`
	Target    string    `json:"target,omitempty"`
	Echo      bool      `json:"echo"`
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
	checkpoint, err := time.Parse(time.RFC3339, req.Header.Get("Last-Event-ID"))
	if err != nil {
		checkpoint = time.Now()
	}
	storageID := GenerateID(ctx.Session)
	userAgent := req.Header.Get("User-Agent")
	res.Header().Set("Content-Type", "text/event-stream")
	res.Header().Set("Cache-Control", "no-cache")
	res.Header().Set("Connection", "keep-alive")
	go func() {
		<-req.Context().Done()
		gate.L.Lock()
		gate.Broadcast()
		gate.L.Unlock()
	}()
	for firstRun := true; ; firstRun = false {
		gate.L.Lock()
		if req.Context().Err() != nil {
			gate.L.Unlock()
			return
		} else if firstRun == false {
			gate.Wait()
		}
		changes := make([]mutation, 0, 10)
		for i, len, curr := 0, journal.Len(), journal.Prev(); i < len; i, curr = i+1, curr.Prev() {
			el := curr.Value.(mutation)
			if el.Time.Before(checkpoint) || el.Time.Equal(checkpoint) {
				break
			}
			if el.StorageID != storageID {
				continue
			}
			el.Echo = el.UserAgent == userAgent
			el.Path = strings.TrimPrefix(el.Path, ctx.Session["path"])
			el.Target = strings.TrimPrefix(el.Target, ctx.Session["path"])
			changes = append(changes, el)
		}
		gate.L.Unlock()
		for i := len(changes); i > 0; i-- {
			el := changes[i-1]
			data, _ := json.Marshal(el)
			fmt.Fprintf(res, "id: %s\nevent: mutation\ndata: %s\n\n", el.Time.Format(time.RFC3339Nano), data)
			checkpoint = changes[0].Time
		}
		flusher.Flush()
	}
}

func EventWatch(ctx *App, req *http.Request, op string, path string, target ...string) {
	t := time.Now()
	go func() {
		cVal := mutation{
			Operation: op,
			Path:      path,
			Target:    strings.Join(target, ","),
			Time:      t.UTC(),
			StorageID: GenerateID(ctx.Session),
			UserAgent: req.Header.Get("User-Agent"),
		}
		gate.L.Lock()
		journal.Value = cVal
		journal = journal.Next()
		gate.Broadcast()
		gate.L.Unlock()
	}()
}
