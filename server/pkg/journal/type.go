package journal

import (
	"fmt"
	"net/http"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/middleware"
)

type Payload interface {
	FileOp | SessionOp | Nop
}

type Timestamp interface{
	Timestamp() time.Time
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

type Observation[T Payload] struct {
	Kind      string
	Time      time.Time
	UserAgent string
	Payload   T
	Done      bool
	Error     error
	onClose   func(http.ResponseWriter)
}

func NewObservation[T Payload](ob Observation[T]) Observation[T] {
	Emit(ob)
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
	Emit(this)
}

func (this Observation[T]) Timestamp() time.Time {
	return this.Time
}
