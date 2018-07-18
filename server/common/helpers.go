package common

import (
	"path/filepath"
	"strings"
)

type Helpers struct {
	AbsolutePath func(p string) string
	MimeType     func(p string) string
}

func NewHelpers(config *Config) *Helpers {
	return &Helpers{
		MimeType:     mimeType(config),
		AbsolutePath: absolutePath(config),
	}
}

func absolutePath(c *Config) func(p string) string {
	return func(p string) string {
		return filepath.Join(c.Runtime.Dirname, p)
	}
}

func mimeType(c *Config) func(p string) string {
	return func(p string) string {
		ext := filepath.Ext(p)
		if ext != "" {
			ext = ext[1:]
		}
		ext = strings.ToLower(ext)
		mType := c.MimeTypes[ext]
		if mType == "" {
			return "application/octet-stream"
		}
		return mType
	}
}
