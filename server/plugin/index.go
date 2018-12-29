package plugin

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"os"
	"path/filepath"
	plg "plugin"
	"strings"
)

func init() {
	ex, _ := os.Executable()
	pPath := filepath.Join(filepath.Dir(ex), PLUGIN_PATH)

	file, err := os.Open(pPath)
	if err != nil {
		return
	}
	files, err := file.Readdir(0)
	for i:=0; i < len(files); i++ {
		name := files[i].Name()
		if strings.HasPrefix(name, ".") {
			continue
		}
		Log.Debug("Load plugin: '%s'", name)
		p, err := plg.Open(pPath + "/" + name)
		if err != nil {
			Log.Warning("Can't load plugin: %s => %v", name, err)
			continue
		}
		fn, err := p.Lookup("Init")
		if err != nil {
			Log.Warning("Can't register plugin: %s => %v", name, err)
			continue
		}
		if obj, ok := fn.(func(config *Configuration)); ok {
			obj(&Config)
		}
	}
}
