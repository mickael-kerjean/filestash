package common

import (
	"bytes"
	"io"
	"io/fs"
	"net/http"
	"path/filepath"
	"sort"
	"strings"

	"github.com/gorilla/mux"
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
var process_file_content_before_send []func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, bool, error)

func (this Register) ProcessFileContentBeforeSend(fn func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, bool, error)) {
	process_file_content_before_send = append(process_file_content_before_send, fn)
}
func (this Get) ProcessFileContentBeforeSend() []func(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, bool, error) {
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
var http_endpoint []func(*mux.Router) error

func (this Register) HttpEndpoint(fn func(*mux.Router) error) {
	http_endpoint = append(http_endpoint, fn)
}
func (this Get) HttpEndpoint() []func(*mux.Router) error {
	return http_endpoint
}

/*
 * Override some urls with static content. The main use case for this is to enable
 * plugins to change the frontend code and overwrite some core components
 */
func (this Register) Static(www fs.FS, chroot string) {
	fs.WalkDir(www, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		} else if d.IsDir() {
			return nil
		}
		this.HttpEndpoint(func(r *mux.Router) error {
			r.PathPrefix("/" + strings.TrimPrefix(path, chroot)).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				f, err := www.Open(path)
				if err != nil {
					w.Header().Set("Content-Type", "text/plain")
					w.Write([]byte("plugin.go::static::err " + err.Error()))
					return
				}
				w.Header().Set("Content-Type", GetMimeType(filepath.Ext(path)))
				io.Copy(w, f)
				f.Close()
			})
			return nil
		})
		return nil
	})
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
var authentication_middleware map[string]IAuthentication = make(map[string]IAuthentication, 0)

func (this Register) AuthenticationMiddleware(id string, am IAuthentication) {
	authentication_middleware[id] = am
}

func (this Get) AuthenticationMiddleware() map[string]IAuthentication {
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
 * The idea here is to enable plugin to register their own thumbnailing process, typically
 * images but could also be videos, pdf, excel documents, ...
 */
var thumbnailer map[string]IThumbnailer = make(map[string]IThumbnailer)

func (this Register) Thumbnailer(mimeType string, fn IThumbnailer) {
	thumbnailer[mimeType] = fn
}

func (this Get) Thumbnailer() map[string]IThumbnailer {
	return thumbnailer
}

/*
 * Pluggable Audit interface
 */
var audit IAuditPlugin

func (this Register) AuditEngine(a IAuditPlugin) {
	audit = a
}

func (this Get) AuditEngine() IAuditPlugin {
	return audit
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

var cssOverride []func() string

func (this Register) CSS(stylesheet string) {
	cssOverride = append(cssOverride, func() string {
		return stylesheet
	})
}

func (this Register) CSSFunc(stylesheet func() string) {
	cssOverride = append(cssOverride, stylesheet)
}

func (this Get) CSS() string {
	s := ""
	for i := 0; i < len(cssOverride); i++ {
		s += cssOverride[i]() + "\n"
	}
	return s
}

var favicon struct {
	binary []byte
	mime   string
}

func (this Register) Favicon(binary []byte) {
	favicon.binary = binary
	favicon.mime = "image/svg+xml"
	if bytes.HasPrefix(binary, []byte{0x00, 0x00, 0x01, 0x00}) {
		favicon.mime = "image/x-icon"
	} else if bytes.HasPrefix(binary, []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}) {
		favicon.mime = "image/png"
	} else if bytes.HasPrefix(binary, []byte{0x47, 0x49, 0x46, 0x38}) {
		favicon.mime = "image/vnd.microsoft.icon"
	}
}

func (this Get) Favicon() ([]byte, string) {
	return favicon.binary, favicon.mime
}

const OverrideVideoSourceMapper = "/overrides/video-transcoder.js"

var afterload []func()

func (this Register) Onload(fn func()) {
	afterload = append(afterload, fn)
}
func (this Get) Onload() []func() {
	return afterload
}

var middlewares []func(HandlerFunc) HandlerFunc

func (this Register) Middleware(m func(HandlerFunc) HandlerFunc) {
	middlewares = append(middlewares, m)
}

func (this Get) Middleware() []func(HandlerFunc) HandlerFunc {
	return middlewares
}

var staticOverrides [][]byte

func (this Register) StaticPatch(pathFile []byte) {
	staticOverrides = append(staticOverrides, pathFile)
}

func (this Get) StaticPatch() [][]byte {
	return staticOverrides
}

var meta IMetadata

func (this Register) Metadata(m IMetadata) {
	meta = m
}

func (this Get) Metadata() IMetadata {
	return meta
}

var workflow_triggers []ITrigger

func (this Register) WorkflowTrigger(t ITrigger) {
	workflow_triggers = append(workflow_triggers, t)
	sort.Slice(workflow_triggers, func(i, j int) bool {
		return workflow_triggers[i].Manifest().Order < workflow_triggers[j].Manifest().Order
	})
}
func (this Get) WorkflowTriggers() []ITrigger {
	return workflow_triggers
}

var workflow_actions []IAction

func (this Register) WorkflowAction(a IAction) {
	workflow_actions = append(workflow_actions, a)
	sort.Slice(workflow_actions, func(i, j int) bool {
		return workflow_actions[i].Manifest().Order < workflow_actions[j].Manifest().Order
	})
}
func (this Get) WorkflowActions() []IAction {
	return workflow_actions
}

func init() {
	Hooks.Register.FrontendOverrides(OverrideVideoSourceMapper)
}
