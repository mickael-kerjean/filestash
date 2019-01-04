package common

import (
	"encoding/json"
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
	LoginForm() Form
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


const PASSWORD_DUMMY = "{{PASSWORD}}"

type Share struct {
	Id           string   `json:"id"`
	Backend      string   `json:"-"`
	Auth         string   `json:"auth,omitempty"`
	Path         string   `json:"path"`
	Password     *string  `json:"password,omitempty"`
	Users        *string  `json:"users,omitempty"`
	Expire       *int64   `json:"expire,omitempty"`
	Url          *string  `json:"url,omitempty"`
	CanShare     bool     `json:"can_share"`
	CanManageOwn bool     `json:"can_manage_own"`
	CanRead      bool     `json:"can_read"`
	CanWrite     bool     `json:"can_write"`
	CanUpload    bool     `json:"can_upload"`
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
		func(pass *string) *string{
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
func(s *Share) UnmarshallJSON(b []byte) error {
	var tmp map[string]interface{}
	if err := json.Unmarshal(b, &tmp); err != nil {
		return err
	}
	for key, value := range tmp {
		switch key {
		case "password": s.Password = NewStringpFromInterface(value)
		case "users": s.Users = NewStringpFromInterface(value)
		case "expire": s.Expire = NewInt64pFromInterface(value)
		case "url": s.Url = NewStringpFromInterface(value)
		case "can_share": s.CanShare = NewBoolFromInterface(value)
		case "can_manage_own": s.CanManageOwn = NewBoolFromInterface(value)
		case "can_read": s.CanRead = NewBoolFromInterface(value)
		case "can_write": s.CanWrite = NewBoolFromInterface(value)
		case "can_upload": s.CanUpload = NewBoolFromInterface(value)
		}
	}
	return nil
}
