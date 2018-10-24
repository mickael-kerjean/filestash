package plugin

import (
	"os"
	"path/filepath"
	plg "plugin"
	. "github.com/mickael-kerjean/nuage/server/common"
	"sort"
	"strings"
	"fmt"
	"net/http"
	"io"
)

const PluginPath = "data/plugin/"

var plugins = make(map[string][]Plugin)

func init() {
	ex, _ := os.Executable()
	pPath := filepath.Join(filepath.Dir(ex), PluginPath)
	
	file, err := os.Open(pPath)
	if err != nil {
		return
	}
	files, err := file.Readdir(0)

	c := NewConfig()
	for i:=0; i < len(files); i++ {
		name := files[i].Name()
		if strings.HasPrefix(name, ".") == true {
			continue
		}
		p, err := plg.Open(pPath + "/" + name)
		if err != nil {
			Log.Warning(fmt.Sprintf("Can't load plugin: %s => %v", name, err))
			continue
		}
		
		f, err := p.Lookup("Register")
		if err != nil {
			Log.Warning(fmt.Sprintf("Can't register plugin: %s => %v", name, err))
			continue
		}
		if obj, ok := f.(func(config *Config) []Plugin); ok {
			for _, plg := range obj(c) {
				plugins[plg.Type] = append(plugins[plg.Type], plg)
				sort.SliceStable(plugins[plg.Type], func(i, j int) bool {
					return plugins[plg.Type][i].Priority > plugins[plg.Type][j].Priority
				})
			}
		}
	}
}


func ProcessFileContentBeforeSend() []func(io.Reader, *App, *http.ResponseWriter, *http.Request) (io.Reader, error) {
	fs := plugins[PROCESS_FILE_CONTENT_BEFORE_SEND]
	ret := make([]func(io.Reader, *App, *http.ResponseWriter, *http.Request) (io.Reader, error), len(fs))
	for _, p := range fs {
		if f, ok := p.Call.(func(io.Reader, *App, *http.ResponseWriter, *http.Request) (io.Reader, error)); ok {
			ret = append(ret, f)	
		}
	}
	return ret
}

