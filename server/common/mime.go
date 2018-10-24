package common

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
)

var MimeTypes map[string]string

func init(){
	path := filepath.Join(GetCurrentDir(), CONFIG_PATH + "mime.json")
	if f, err := os.OpenFile(path, os.O_RDONLY, os.ModePerm); err == nil {
		j, _ := ioutil.ReadAll(f)
		json.Unmarshal(j, &MimeTypes)
		f.Close()
	}
}

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
