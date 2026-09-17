package journal

import (
	"net/http"
	"slices"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/tracer"
)

func PublishFS(ctx *App, req *http.Request, topic string, path string, target ...string) Observation[FileOp] {
	return NewObservation(Observation[FileOp]{
		At:   time.Now().UTC(),
		Kind: "fs",
		Payload: FileOp{
			Operation: topic,
			Mutation:  slices.Contains([]string{"mv", "rm", "mkdir", "touch", "save"}, topic),
			Path:      path,
			Target:    strings.Join(target, ","),
			StorageID: GenerateID(ctx.Session),
		},
		Trace: tracer.Extract(req),
		Emit:  emit[FileOp],
	})
}

func PublishSession(ctx *App, req *http.Request, cmd string) Observation[SessionOp] {
	return NewObservation(Observation[SessionOp]{
		At:   time.Now().UTC(),
		Kind: "session",
		Payload: SessionOp{
			Operation: cmd,
		},
		Trace: tracer.Extract(req),
		Emit:  emit[SessionOp],
	})
}

func PublishEvent(ctx *App, req *http.Request, data EventOp) Observation[EventOp] {
	return NewObservation(Observation[EventOp]{
		At:   time.Now().UTC(),
		Kind: "event",
		Payload: data,
		Trace: tracer.Extract(req),
		Emit:  emit[EventOp],
	})
}

func emit[T Payload](val Observation[T]) {
	gate.L.Lock()
	journal.Set(val)
	journal = journal.Next()
	gate.Broadcast()
	gate.L.Unlock()
}
