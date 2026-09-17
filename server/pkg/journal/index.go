package journal

import (
	"sync"
	"time"
)

var (
	journal = NewRing[IObservation](5000, Observation[Nop]{ At: time.Now().UTC() })
	gate    = sync.NewCond(&sync.Mutex{})
)

type Payload interface {
	FileOp | SessionOp | EventOp | Nop
}

type FileOp struct {
	Operation string `json:"operation"`
	Mutation  bool   `json:"mutation"`
	Path      string `json:"path"`
	Target    string `json:"target,omitempty"`
	StorageID string `json:"-"`
}

type SessionOp struct {
	Operation string `json:"operation"`
}

type EventOp map[string]any

type Nop struct{}
