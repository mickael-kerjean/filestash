package journal

import (
	"fmt"
	"net/http"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/middleware"

	"github.com/mickael-kerjean/filestash/server/pkg/tracer"
)

type Observation[T Payload] struct {
	Kind    string
	At      time.Time
	Payload T
	Trace   tracer.TraceContext
	Done    bool
	Error   error
	Emit    func(Observation[T])
}

type IObservation interface {
	Time() time.Time
}

func NewObservation[T Payload](ob Observation[T]) Observation[T] {
	ob.Emit(ob)
	return ob
}

func (this Observation[T]) Close(res http.ResponseWriter) {
	this.At = time.Now().UTC()
	this.Done = true
	if obj, ok := res.(*ResponseWriter); ok {
		status := obj.Status()
		if status >= 400 {
			this.Error = fmt.Errorf("status %d", status)
		}
	}
	this.Emit(this)
}

func (this Observation[T]) Time() time.Time {
	return this.At
}
