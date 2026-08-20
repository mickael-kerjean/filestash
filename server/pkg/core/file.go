package core

import (
	"io"
	"net/http"
	"os"
	"time"
)

type IFile interface {
	os.FileInfo
	Path() string
}

type IThumbnailer interface {
	Generate(io.ReadCloser, *App, *http.ResponseWriter, *http.Request) (io.ReadCloser, error)
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
