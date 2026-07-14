package plg_editor_codemirror

import (
	"encoding/json"
	"fmt"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func HandlerPull(ctx *App, res http.ResponseWriter, req *http.Request) {
	clientID := req.URL.Query().Get("clientID")
	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	flusher, ok := res.(http.Flusher)
	if !ok {
		SendErrorResult(res, NewError("streaming not supported", 500))
		return
	}
	res.Header().Set("Content-Type", "text/event-stream")
	res.Header().Set("Cache-Control", "no-cache")
	res.Header().Set("Connection", "keep-alive")
	ch := make(chan []Change, 128)
	doc := getDocument(ctx, path)
	doc.Transaction(func() {
		sub := subscriber{clientID: clientID, ch: ch}
		doc.subscribers = append(doc.subscribers, sub)
		if len(doc.changes) > 0 {
			data, _ := json.Marshal(doc.changes)
			fmt.Fprintf(res, "data: %s\n\n", data)
			flusher.Flush()
		}
	})
	defer doc.Transaction(func() {
		for i, s := range doc.subscribers {
			if s.ch == ch {
				doc.subscribers = append(doc.subscribers[:i], doc.subscribers[i+1:]...)
				break
			}
		}
		if len(doc.subscribers) == 0 {
			removeDocument(ctx, path)
		}
	})

	for {
		select {
		case changes := <-ch:
			data, _ := json.Marshal(changes)
			fmt.Fprintf(res, "data: %s\n\n", data)
			flusher.Flush()
		case <-req.Context().Done():
			return
		}
	}
}

func HandlerPush(ctx *App, res http.ResponseWriter, req *http.Request) {
	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	var body struct {
		Changes []Change `json:"changes"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		SendErrorResult(res, NewError(err.Error(), 400))
		return
	}
	doc := getDocument(ctx, path)
	doc.Transaction(func() {
		doc.changes = append(doc.changes, body.Changes...)
		for _, s := range doc.subscribers {
			select {
			case s.ch <- body.Changes:
			default:
			}
		}
	})
	SendSuccessResult(res, nil)
}

func HandlerReset(ctx *App, res http.ResponseWriter, req *http.Request) {
	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	doc := getDocument(ctx, path)
	doc.Transaction(func() {
		doc.changes = nil
	})
	SendSuccessResult(res, nil)
}
