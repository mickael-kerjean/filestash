package mime

import (
	"path/filepath"
	"strings"
)

//go:generate go run generator.go
var MimeTypes map[string]string = make(map[string]string, 0)

func GetMimeType(p string) string {
	ext := filepath.Ext(p)
	if ext != "" {
		ext = ext[1:]
	}
	mType := MimeTypes[strings.ToLower(ext)]
	if mType == "" {
		return "application/octet-stream"
	}
	return mType
}

func AllMimeTypes() map[string]string {
	return MimeTypes
}
