package common

import (
	"io"
	"net/http"
)

const (
	PluginTypeBackend    = "backend"
	PluginTypeMiddleware = "middleware"
)

type Plugin struct {
	Type   string
	Enable bool
}


type Register struct{}
type Get struct{}

var Hooks = struct {
	Get Get
	Register Register
}{
	Get: Get{},
	Register: Register{},
}

var process_file_content_before_send []func(io.Reader, *App, *http.ResponseWriter, *http.Request) (io.Reader, error)
func (this Register) ProcessFileContentBeforeSend(fn func(io.Reader, *App, *http.ResponseWriter, *http.Request) (io.Reader, error)) {
	process_file_content_before_send = append(process_file_content_before_send, fn)
}
func (this Get) ProcessFileContentBeforeSend() []func(io.Reader, *App, *http.ResponseWriter, *http.Request) (io.Reader, error) {
	return process_file_content_before_send
}
