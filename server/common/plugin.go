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
}

/*
 * ProcessFileContentBeforeSend is a processing hooks used in plugins like:
 * 1. pluggable image transcoding service: plg_image_light, plg_image_bimg, plg_image_golang
 * 2. video transcoding service: plg_video_transcode
 * 3. disallow certain type of file: plg_security_svg
 */
var process_file_content_before_send []func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error)

func (this Register) ProcessFileContentBeforeSend(fn func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error)) {
	process_file_content_before_send = append(process_file_content_before_send, fn)
}
func (this Get) ProcessFileContentBeforeSend() []func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error) {
	return process_file_content_before_send
}

/*
 * HttpEndpoint is a hook that makes it possible to register new endpoint in the application.
 * It is used in plugin like:
 * 1. plg_video_transcoder to server the transcoded video segment via hls
 * 2. plg_editor_onlyoffice to server the content for a custom type in an iframe
 * 3. plg_handler_syncthing to create better integration with syncthing
 * 4. plg_handler_console to server a full blown console for debugging the application
 */
var http_endpoint []func(*mux.Router, *App) error

func (this Register) HttpEndpoint(fn func(*mux.Router, *App) error) {
	http_endpoint = append(http_endpoint, fn)
}
func (this Get) HttpEndpoint() []func(*mux.Router, *App) error {
	return http_endpoint
}

/*
 * Starter is the meat that let us connect to a wide variety of server like:
 * - plg_starter_http which is the default that server the application under 8334
 * - plg_starter_tor to serve the application via tor
 * - plg_starter_web that create ssl certificate via letsencrypt
 * - plg_started_http2 to create an HTTP2 server
 * - ...
 */
var starter_process []func(*mux.Router)

func (this Register) Starter(fn func(*mux.Router)) {
	starter_process = append(starter_process, fn)
}
func (this Get) Starter() []func(*mux.Router) {
	return starter_process
}

/*
 * AuthenticationMiddleware is what enabled us to authenticate user via different means:
 * - plg_authentication_admin to enable connection to an admin
 * - plg_authentication_saml
 * - plg_authentication_openid
 * - plg_authentication_ldap
 * - ...
 */
var authentication_middleware map[string]IAuth = make(map[string]IAuth, 0)

func (this Register) AuthenticationMiddleware(id string, am IAuth) {
	authentication_middleware[id] = am
}

func (this Get) AuthenticationMiddleware() map[string]IAuth {
	return authentication_middleware
}

/*
 * AuthorisationMiddleware is to enable custom rule for authorisation. eg: anonymous can see, registered
 * user can see/edit some files but not some others, admin can do everything
 */
var authorisation_middleware []IAuthorisation

func (this Register) AuthorisationMiddleware(a IAuthorisation) {
	authorisation_middleware = append(authorisation_middleware, a)
}

func (this Get) AuthorisationMiddleware() []IAuthorisation {
	return authorisation_middleware
}

/*
 * Search is the pluggable search mechanism. By default, there's 2 options:
 * - plg_search_stateless which does stateless search based on filename only
 * - plg_search_statefull which does full text search with a sqlite data store
 * The idea here is to enable different type of usage like leveraging elastic search or solr
 * with custom stuff around it
 */
var search ISearch

func (this Register) SearchEngine(s ISearch) {
	search = s
}

func (this Get) SearchEngine() ISearch {
	return search
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
