package journal

import (
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
		Emit: emit[FileOp],
	})
}

func RecordSession(ctx *App, req *http.Request, cmd string) Observation[SessionOp] {
	return NewObservation(Observation[SessionOp]{
		Kind:      "session",
		Time:      time.Now().UTC(),
		UserAgent: req.Header.Get("User-Agent"),
		Payload: SessionOp{
			Operation: cmd,
		},
		Emit: emit[SessionOp],
	})
}

func emit[T Payload](val Observation[T]) {
	gate.L.Lock()
	journal.Value = val
	journal = journal.Next()
	gate.Broadcast()
	gate.L.Unlock()
}
