package common

import (
	"path/filepath"
	"strings"
)

//go:generate sh -c "go run ../generator/mime.go > mime_generated.go && go fmt mime_generated.go"
var MimeTypes map[string]string = make(map[string]string, 0)

func GetMimeType(p string) string {
	ext := filepath.Ext(p)
	if ext != "" {
		ext = ext[1:]
	}
	ext = strings.ToLower(ext)
	mType := MimeTypes[ext]
	if mType == "" {
		return "application/octet-stream"
	}
	return mType
}

func AllMimeTypes() map[string]string {
	return MimeTypes
}
