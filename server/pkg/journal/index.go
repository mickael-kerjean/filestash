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
