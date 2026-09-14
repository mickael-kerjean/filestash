package journal

import (
	"fmt"
	"net/http"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/middleware"
)

type Observation[T Payload] struct {
	Kind      string
	Time      time.Time
	UserAgent string
	Payload   T
	Done      bool
	Error     error
	onClose   func(http.ResponseWriter)
	Emit      func(Observation[T])
}

func NewObservation[T Payload](ob Observation[T]) Observation[T] {
	ob.Emit(ob)
	return ob
}

func (this Observation[T]) Close(res http.ResponseWriter) {
	this.Time = time.Now().UTC()
	this.Done = true
	if obj, ok := res.(*ResponseWriter); ok {
		status := obj.Status()
		if status >= 400 {
			this.Error = fmt.Errorf("status %d", status)
		}
	}
	this.Emit(this)
}

func (this Observation[T]) Timestamp() time.Time {
	return this.Time
}
