package journal

import (
	"context"
	"net/http"
	"slices"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func RecordFile(ctx *App, req *http.Request, topic string, path string, target ...string) Observation[FileOp] {
	return NewObservation(Observation[FileOp]{
		Kind:      "fs",
		Time:      time.Now().UTC(),
		UserAgent: req.Header.Get("User-Agent"),
		Payload: FileOp{
			Operation: topic,
			Mutation:  slices.Contains([]string{"mv", "rm", "mkdir", "touch", "save"}, topic),
			Path:      path,
			Target:    strings.Join(target, ","),
			StorageID: GenerateID(ctx.Session),
		},
	})
}

func RecordSession(ctx *App, req *http.Request, cmd string) Observation[SessionOp] {
	return NewObservation(Observation[SessionOp]{
		Kind: "session",
		Time: time.Now().UTC(),
		Payload: SessionOp{
			Operation: cmd,
		},
	})
}

func Emit[T Payload](val Observation[T]) {
	gate.L.Lock()
	journal.Value = val
	journal = journal.Next()
	gate.Broadcast()
	gate.L.Unlock()
}

func Listen[T Payload](ctx context.Context, since time.Time, filter func(Observation[T]) bool) <-chan []Observation[T] {
	out := make(chan []Observation[T])
	go func() {
		for firstRun := true; ; firstRun = false {
			changes := make([]Observation[T], 0, 1)
			gate.L.Lock()
			if ctx.Err() != nil {
				gate.L.Unlock()
				close(out)
				return
			} else if firstRun == false {
				gate.Wait()
			}
			for i, len, curr := 0, journal.Len(), journal.Prev(); i < len; i, curr = i+1, curr.Prev() {
				t := curr.Value.(Timestamp).Timestamp()
				if t.Before(since) || t.Equal(since) {
					break
				}
				if el, ok := curr.Value.(Observation[T]); ok && filter(el) {
					changes = append(changes, el)
				}
			}
			gate.L.Unlock()
			if len(changes) > 0 {
				since = changes[0].Time
			}
			slices.Reverse(changes)
			out <- changes
		}
	}()
	go func() {
		<-ctx.Done()
		gate.L.Lock()
		gate.Broadcast()
		gate.L.Unlock()
	}()
	return out
}
