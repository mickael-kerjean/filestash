package common

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"
)

type IBackend interface {
	Init(params map[string]string, app *App) (IBackend, error)
	Ls(path string) ([]os.FileInfo, error)
	Cat(path string) (io.ReadCloser, error)
	Mkdir(path string) error
	Rm(path string) error
	Mv(from string, to string) error
	Save(path string, file io.Reader) error
	Touch(path string) error
	LoginForm() Form
}

type IAuth interface {
	Setup() Form
	EntryPoint(idpParams map[string]string, req *http.Request, res http.ResponseWriter) error
	Callback(formData map[string]string, idpParams map[string]string, res http.ResponseWriter) (map[string]string, error)
}

type IAuthorisation interface {
	Ls(ctx *App, path string) error
	Cat(ctx *App, path string) error
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

type IAuditPlugin interface {
	Query(ctx *App, searchParams map[string]string) (AuditQueryResult, error)
}
type AuditQueryResult struct {
	Form       *Form  `json:"form"`
	RenderHTML string `json:"render"`
}

type File struct {
	FName     string `json:"name"`
	FType     string `json:"type"`
	FTime     int64  `json:"time"`
	FSize     int64  `json:"size"`
	FPath     string `json:"path,omitempty"`
	CanRename *bool  `json:"can_rename,omitempty"`
	CanMove   *bool  `json:"can_move_directory,omitempty"`
	CanDelete *bool  `json:"can_delete,omitempty"`
}

func (f File) Name() string {
	return f.FName
}
func (f File) Size() int64 {
	return f.FSize
}
func (f File) Mode() os.FileMode {
	if f.IsDir() {
		return os.ModeDir
	}
	return 0
}
func (f File) ModTime() time.Time {
	if f.FTime == 0 {
		return time.Now()
	}
	return time.Unix(f.FTime, 0)
}
func (f File) IsDir() bool {
	if f.FType != "directory" {
		return false
	}
	return true
}
func (f File) Sys() interface{} {
	return nil
}

func (f File) Path() string {
	return f.FPath
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

const PASSWORD_DUMMY = "{{PASSWORD}}"

type Share struct {
	Id           string  `json:"id"`
	Backend      string  `json:"-"`
	Auth         string  `json:"auth,omitempty"`
	Path         string  `json:"path"`
	Password     *string `json:"password,omitempty"`
	Users        *string `json:"users,omitempty"`
	Expire       *int64  `json:"expire,omitempty"`
	Url          *string `json:"url,omitempty"`
	CanShare     bool    `json:"can_share"`
	CanManageOwn bool    `json:"can_manage_own"`
	CanRead      bool    `json:"can_read"`
	CanWrite     bool    `json:"can_write"`
	CanUpload    bool    `json:"can_upload"`
}

func (s Share) IsValid() error {
	if s.Expire != nil {
		now := time.Now().UnixNano() / 1000000
		if now > *s.Expire {
			return NewError("Link has expired", 410)
		}
	}
	return nil
}

func (s *Share) MarshalJSON() ([]byte, error) {
	p := Share{
		s.Id,
		s.Backend,
		"",
		s.Path,
		func(pass *string) *string {
			if pass != nil {
				return NewString(PASSWORD_DUMMY)
			}
			return nil
		}(s.Password),
		s.Users,
		s.Expire,
		s.Url,
		s.CanShare,
		s.CanManageOwn,
		s.CanRead,
		s.CanWrite,
		s.CanUpload,
	}
	return json.Marshal(p)
}
func (s *Share) UnmarshallJSON(b []byte) error {
	var tmp map[string]interface{}
	if err := json.Unmarshal(b, &tmp); err != nil {
		return err
	}
	for key, value := range tmp {
		switch key {
		case "password":
			s.Password = NewStringpFromInterface(value)
		case "users":
			s.Users = NewStringpFromInterface(value)
		case "expire":
			s.Expire = NewInt64pFromInterface(value)
		case "url":
			s.Url = NewStringpFromInterface(value)
		case "can_share":
			s.CanShare = NewBoolFromInterface(value)
		case "can_manage_own":
			s.CanManageOwn = NewBoolFromInterface(value)
		case "can_read":
			s.CanRead = NewBoolFromInterface(value)
		case "can_write":
			s.CanWrite = NewBoolFromInterface(value)
		case "can_upload":
			s.CanUpload = NewBoolFromInterface(value)
		}
	}
	return nil
}
