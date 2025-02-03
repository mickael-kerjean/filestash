package plg_search_sqlitefts

import (
	"strings"
	"time"
)

const (
	PHASE_EXPLORE  = "PHASE_EXPLORE"
	PHASE_INDEXING = "PHASE_INDEXING"
	PHASE_MAINTAIN = "PHASE_MAINTAIN"
	PHASE_PAUSE    = "PHASE_PAUSE"
)

const MAX_HEAP_SIZE = 100000

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

func (h HeapDoc) Len() int { return len(h) }
func (h HeapDoc) Less(i, j int) bool {
	if h[i].Priority != 0 || h[j].Priority != 0 {
		return h[i].Priority < h[j].Priority
	}
	scoreA := len(strings.Split(h[i].Path, "/")) / len(strings.Split(h[i].InitialPath, "/"))
	scoreB := len(strings.Split(h[j].Path, "/")) / len(strings.Split(h[j].InitialPath, "/"))
	return scoreA < scoreB
}
func (h HeapDoc) Swap(i, j int) {
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
