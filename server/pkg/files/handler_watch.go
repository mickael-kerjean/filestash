package files

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"

	"github.com/mickael-kerjean/filestash/server/pkg/journal"
)

const heartbeatPeriod = 15 * time.Second

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
	chroot := EnforceDirectory(ctx.Session["path"])
	userAgent := req.Header.Get("User-Agent")
	res.Header().Set("Content-Type", "text/event-stream")
	res.Header().Set("Cache-Control", "no-cache")
	res.Header().Set("Connection", "keep-alive")
	flusher.Flush()

	stream := journal.Subscribe[journal.FileOp](
		req.Context(),
		checkpoint,
		func(el journal.Observation[journal.FileOp]) bool {
			return el.Payload.StorageID == storageID && el.Payload.Mutation && el.Done && el.Error == nil
		},
	)
	heartbeat := time.NewTicker(heartbeatPeriod)
	defer heartbeat.Stop()

	for {
		select {
		case changes, more := <-stream:
			if !more {
				return
			}
			for _, change := range changes {
				if !strings.HasPrefix(change.Payload.Path, chroot) {
					continue
				}
				data, _ := json.Marshal(struct {
					Kind      string `json:"kind"`
					Echo      bool   `json:"echo"`
					Operation string `json:"op"`
					Path      string `json:"path"`
					Target    string `json:"target,omitempty"`
					Trace     string `json:"trace,omitempty"`
				}{
					Kind:      change.Kind,
					Echo:      change.Trace.UserAgent == userAgent,
					Operation: change.Payload.Operation,
					Path:      clientpath(change.Payload.Path, chroot),
					Target:    clientpath(change.Payload.Target, chroot),
					Trace:     change.Trace.TraceID,
				})
				fmt.Fprintf(
					res,
					"id: %s\ndata: %s\n\n",
					change.Time().Format(time.RFC3339Nano),
					data,
				)
			}
			heartbeat.Reset(heartbeatPeriod)
		case <-heartbeat.C:
			fmt.Fprintf(res, "data: {\"kind\":\"heartbeat\"}\n\n")
		}
		flusher.Flush()
	}
}

func clientpath(fullpath string, chroot string) string {
	if fullpath == "" {
		return fullpath
	}
	return "/" + strings.TrimPrefix(fullpath, chroot)
}
