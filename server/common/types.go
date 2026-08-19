package common

import (
	"io"
	"net/http"
	"os"
	"time"

	"github.com/mickael-kerjean/filestash/server/pkg/tracer"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

type IBackend interface {
	Init(params map[string]string, app *App) (IBackend, error)
	Ls(path string) ([]os.FileInfo, error)
	Stat(path string) (os.FileInfo, error)
	Cat(path string) (io.ReadCloser, error)
	Mkdir(path string) error
	Rm(path string) error
	Mv(from string, to string) error
	Save(path string, file io.Reader) error
	Touch(path string) error
	LoginForm() Form
}

type IAuthentication interface {
	Setup() Form
	EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error
	Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error)
}

type IAuthorisation interface {
	Ls(ctx *App, path string) error
	Cat(ctx *App, path string) error
	Stat(ctx *App, path string) error
	Mkdir(ctx *App, path string) error
	Rm(ctx *App, path string) error
	Mv(ctx *App, from string, to string) error
	Save(ctx *App, path string) error
	Touch(ctx *App, path string) error
}

type IFile interface {
	os.FileInfo
	Path() string
}

type ISearch interface {
	Query(ctx App, basePath string, term string) ([]IFile, error)
}

type ILogger interface {
	Debug(format string, v ...interface{})
	Info(format string, v ...interface{})
	Warning(format string, v ...interface{})
	Error(format string, v ...interface{})
	Stdout(format string, v ...interface{})
	SetVisibility(str string)
}

type IThumbnailer interface {
	Generate(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error)
}

type IAuditPlugin interface {
	Query(ctx *App, searchParams map[string]string) (AuditQueryResult, error)
}
type AuditQueryResult struct {
	Form       *Form  `json:"form"`
	RenderHTML string `json:"render"`
}

type ITracer = tracer.ITracer
type ISpan = tracer.ISpan

type IMetadata interface {
	Get(ctx *App, path string) ([]FormElement, error)
	Set(ctx *App, path string, value []FormElement) error
	Search(ctx *App, path string, facets map[string]any) (map[string][]FormElement, error)
}

type ITrigger interface {
	Manifest() WorkflowSpecs
	Init() (chan ITriggerEvent, error)
}

type IAction interface {
	Manifest() WorkflowSpecs
	Execute(params map[string]string, input map[string]string) (map[string]string, error)
}

type IDirectoryService interface {
	Search(query string) ([]DirectoryUser, error)
}

type DirectoryUser struct {
	Id    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type ITriggerEvent interface {
	WorkflowID() string
	Input() map[string]string
}

type File = utils.File

type WorkflowSpecs struct {
	Name     string `json:"name"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Icon     string `json:"icon"`
	Specs    Form   `json:"specs"`
	Order    int    `json:"-"`
}

type Metadata struct {
	CanSee             *bool      `json:"can_read,omitempty"`
	CanCreateFile      *bool      `json:"can_create_file,omitempty"`
	CanCreateDirectory *bool      `json:"can_create_directory,omitempty"`
	CanRename          *bool      `json:"can_rename,omitempty"`
	CanMove            *bool      `json:"can_move,omitempty"`
	CanUpload          *bool      `json:"can_upload,omitempty"`
	CanDelete          *bool      `json:"can_delete,omitempty"`
	CanShare           *bool      `json:"can_share,omitempty"`
	HideExtension      *bool      `json:"hide_extension,omitempty"`
	RefreshOnCreate    *bool      `json:"refresh_on_create,omitempty"`
	Expire             *time.Time `json:"-"`
}

type HandlerFunc func(*App, http.ResponseWriter, *http.Request)

type Middleware func(HandlerFunc) HandlerFunc
