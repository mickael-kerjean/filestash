package journal

import (
	"container/ring"
	"sync"
	"time"
)

var (
	journal = ring.New(5000)
	gate    = sync.NewCond(&sync.Mutex{})
)

func init() {
	t := time.Now().UTC()
	for i := 0; i < journal.Len(); i++ {
		journal.Value = Observation[Nop]{Time: t}
		journal = journal.Next()
	}
}

type Payload interface {
	FileOp | SessionOp | Nop
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

type Nop struct{}

type Timestamp interface {
	Timestamp() time.Time
}
