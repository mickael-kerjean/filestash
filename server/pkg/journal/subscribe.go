package journal

import (
	"context"
	"slices"
	"time"
)

func Listen[T Payload](ctx context.Context, since time.Time, filter func(Observation[T]) bool) <-chan []Observation[T] {
	out := make(chan []Observation[T])
	go func() {
		for firstRun, checkpoint := true, since; ; firstRun = false {
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
				if !curr.Value.(Timestamp).Timestamp().After(checkpoint) {
					break
				}
				if el, ok := curr.Value.(Observation[T]); ok && filter(el) {
					changes = append(changes, el)
				}
			}
			if journal.Prev().Value.(Timestamp).Timestamp().After(checkpoint) {
				checkpoint = journal.Prev().Value.(Timestamp).Timestamp()
			}
			gate.L.Unlock()
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
