package files

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/journal"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func FileWatch(ctx *App, res http.ResponseWriter, req *http.Request) {
	flusher, ok := res.(http.Flusher)
	if !ok {
		SendErrorResult(res, NewError("streaming not supported", 500))
		return
	}
	var (
		checkpoint time.Time
		err        error
	)
	if eventID := req.Header.Get("Last-Event-ID"); eventID != "" {
		checkpoint, err = time.Parse(time.RFC3339, eventID)
		if err != nil {
			SendErrorResult(res, ErrNotValid)
			return
		}
	} else {
		checkpoint = time.Now()
	}
	storageID := GenerateID(ctx.Session)
	userAgent := req.Header.Get("User-Agent")
	res.Header().Set("Content-Type", "text/event-stream")
	res.Header().Set("Cache-Control", "no-cache")
	res.Header().Set("Connection", "keep-alive")
	flusher.Flush()
	for changes := range Listen(req.Context(), checkpoint, func(el Observation[FileOp]) bool {
		return el.Payload.StorageID == storageID && el.Payload.Mutation && el.Done && el.Error == nil
	}) {
		for _, change := range changes {
			out := struct {
				Echo      bool   `json:"echo"`
				Operation string `json:"operation"`
				Path      string `json:"path"`
				Target    string `json:"target,omitempty"`
			}{
				Echo:      change.UserAgent == userAgent,
				Operation: change.Payload.Operation,
				Path:      strings.TrimPrefix(change.Payload.Path, ctx.Session["path"]),
				Target:    strings.TrimPrefix(change.Payload.Target, ctx.Session["path"]),
			}
			data, _ := json.Marshal(out)
			fmt.Fprintf(
				res,
				"id: %s\nevent: %s\ndata: %s\n\n",
				change.Time.Format(time.RFC3339Nano),
				change.Kind,
				data,
			)
		}
		flusher.Flush()
	}
}
