package journal

import (
	"time"
)

type fileop struct {
	Kind      string    `json:"-"`
	Operation string    `json:"operation"`
	Path      string    `json:"path"`
	Target    string    `json:"target,omitempty"`
	Echo      bool      `json:"echo"`
	StorageID string    `json:"-"`
	Time      time.Time `json:"-"`
	UserAgent string    `json:"-"`
}
