package pdebug

import (
	"io"

	"github.com/lestrrat-go/option"
)

type Option = option.Interface

type identClock struct{}
type identWriter struct{}

func WithClock(v Clock) Option {
	return option.New(identClock{}, v)
}

func WithWriter(v io.Writer) Option {
	return option.New(identWriter{}, v)
}
