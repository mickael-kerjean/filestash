package common

import (
	"io"
	slog "log"
)

func NewNilLogger() *slog.Logger {
	return slog.New(dummyWriter{}, "", slog.LstdFlags)
}

type dummyWriter struct {
	io.Writer
}

func (this dummyWriter) Write(p []byte) (n int, err error) {
	return len(p), nil
}
