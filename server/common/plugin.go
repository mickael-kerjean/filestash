package common

import (
	"github.com/gorilla/mux"
	"io"
	"net/http"
)

type Plugin struct {
	Type   string
	Enable bool
}

type Register struct{}
type Get struct{}
type All struct{}

var Hooks = struct {
	Get      Get
	Register Register
	All      All
}{
	Get:      Get{},
	Register: Register{},
	All:      All{},
}

var process_file_content_before_send []func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error)

func (this Register) ProcessFileContentBeforeSend(fn func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error)) {
	process_file_content_before_send = append(process_file_content_before_send, fn)
}
func (this Get) ProcessFileContentBeforeSend() []func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error) {
	return process_file_content_before_send
}

var http_endpoint []func(*mux.Router, *App) error

func (this Register) HttpEndpoint(fn func(*mux.Router, *App) error) {
	http_endpoint = append(http_endpoint, fn)
}
func (this Get) HttpEndpoint() []func(*mux.Router, *App) error {
	return http_endpoint
}

var starter_process []func(*mux.Router)

func (this Register) Starter(fn func(*mux.Router)) {
	starter_process = append(starter_process, fn)
}
func (this Get) Starter() []func(*mux.Router) {
	return starter_process
}

var authentication_middleware map[string]IAuth = make(map[string]IAuth, 0)

func (this Register) AuthenticationMiddleware(id string, am IAuth) {
	authentication_middleware[id] = am
}

func (this All) AuthenticationMiddleware() map[string]IAuth {
	return authentication_middleware
}

/*
 * UI Overrides
 * They are the means by which server plugin change the frontend behaviors.
 */
var overrides []string

func (this Register) FrontendOverrides(url string) {
	overrides = append(overrides, url)
}
func (this Get) FrontendOverrides() []string {
	return overrides
}

var xdg_open []string

func (this Register) XDGOpen(jsString string) {
	xdg_open = append(xdg_open, jsString)
}
func (this Get) XDGOpen() []string {
	return xdg_open
}

const OverrideVideoSourceMapper = "/overrides/video-transcoder.js"

func init() {
	Hooks.Register.FrontendOverrides(OverrideVideoSourceMapper)
}
