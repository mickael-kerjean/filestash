package common

import (
	"io"
	"net/http"
	"github.com/gorilla/mux"
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

var process_file_content_before_send []func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error)
func (this Register) ProcessFileContentBeforeSend(fn func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error)) {
	process_file_content_before_send = append(process_file_content_before_send, fn)
}
func (this Get) ProcessFileContentBeforeSend() []func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error) {
	return process_file_content_before_send
}

var http_endpoint []func(*mux.Router) error
func (this Register) HttpEndpoint(fn func(*mux.Router) error) {
	http_endpoint = append(http_endpoint, fn)
}
func (this Get) HttpEndpoint() []func(*mux.Router) error {
	return http_endpoint
}

var starter_process []func(*mux.Router)
func (this Register) Starter(fn func(*mux.Router)) {
	starter_process = append(starter_process, fn)
}
func (this Get) Starter() []func(*mux.Router) {
	return starter_process
}
