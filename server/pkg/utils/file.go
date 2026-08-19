package utils

import (
	"os"
	"time"
)

type File struct {
	FName    string `json:"name"`
	FType    string `json:"type"`
	FTime    int64  `json:"time"`
	FSize    int64  `json:"size"`
	FPath    string `json:"path,omitempty"`
	Offline  bool   `json:"offline,omitempty"`
	Metadata any    `json:"metadata,omitempty"`
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
	return os.FileMode(0664)
}

func (f File) ModTime() time.Time {
	if f.FTime == 0 {
		t := new(time.Time)
		return *t
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
	return f
}

func (f File) Path() string {
	return f.FPath
}
