package common

import (
	"io"
	"os"
	"time"
)

type IBackend interface {
	Init(params map[string]string, app *App) (IBackend, error)
	Ls(path string) ([]os.FileInfo, error)
	Cat(path string) (io.Reader, error)
	Mkdir(path string) error
	Rm(path string) error
	Mv(from string, to string) error
	Save(path string, file io.Reader) error
	Touch(path string) error
	Info() string
}

type File struct {
	FName     string `json:"name"`
	FType     string `json:"type"`
	FTime     int64  `json:"time"`
	FSize     int64  `json:"size"`
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
	return 0
}
func (f File) ModTime() time.Time {
	return time.Now()
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

type Metadata struct {
	CanSee             *bool      `json:"can_read,omitempty"`
	CanCreateFile      *bool      `json:"can_create_file,omitempty"`
	CanCreateDirectory *bool      `json:"can_create_directory,omitempty"`
	CanRename          *bool      `json:"can_rename,omitempty"`
	CanMove            *bool      `json:"can_move,omitempty"`
	CanUpload          *bool      `json:"can_upload,omitempty"`
	CanDelete          *bool      `json:"can_delete,omitempty"`
	CanShare           *bool      `json:"can_share,omitempty"`
	Expire             *time.Time `json:"-"`
}
