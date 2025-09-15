package model

import (
	"archive/zip"
	"encoding/json"
	"io"
	"os"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var PLUGINS = map[string]PluginImpl{}

type PluginImpl struct {
	Author  string              `json:"author"`
	Version string              `json:"version"`
	Modules []map[string]string `json:"modules"`
}

func PluginDiscovery() error {
	f, err := os.Open(GetAbsolutePath(PLUGIN_PATH))
	if err != nil {
		return err
	}
	entries, err := f.ReadDir(0)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		fname := entry.Name()
		if strings.HasSuffix(fname, ".zip") == false {
			continue
		}
		name, impl, err := InitModule(entry.Name())
		if err != nil {
			Log.Error("could not initialise module name=%s err=%s", entry.Name(), err.Error())
			continue
		}
		for i := 0; i < len(impl.Modules); i++ {
			switch impl.Modules[i]["type"] {
			case "css":
				b, err := GetPluginFile(name, impl.Modules[i]["entrypoint"])
				if err != nil {
					return err
				}
				Hooks.Register.CSS(string(b))
			case "patch":
				b, err := GetPluginFile(name, impl.Modules[i]["entrypoint"])
				if err != nil {
					return err
				}
				Hooks.Register.StaticPatch(b)
			case "favicon":
				b, err := GetPluginFile(name, impl.Modules[i]["entrypoint"])
				if err != nil {
					return err
				}
				Hooks.Register.Favicon(b)
			}
		}
		PLUGINS[name] = impl
	}
	return nil
}

func GetPluginFile(pluginName string, path string) ([]byte, error) {
	zipReader, err := zip.OpenReader(JoinPath(
		GetAbsolutePath(PLUGIN_PATH),
		pluginName+".zip",
	))
	if err != nil {
		return nil, err
	}
	for _, zipFile := range zipReader.File {
		if zipFile.Name != path {
			continue
		}
		f, err := zipFile.Open()
		if err != nil {
			zipReader.Close()
			return nil, err
		}
		data, err := io.ReadAll(f)
		f.Close()
		zipReader.Close()
		if err != nil {
			return nil, err
		}
		return data, nil
	}
	zipReader.Close()
	return nil, ErrNotFound
}

func InitModule(plgName string) (string, PluginImpl, error) {
	var plgImpl = PluginImpl{}
	r, err := zip.OpenReader(JoinPath(GetAbsolutePath(PLUGIN_PATH), plgName))
	plgName = strings.TrimSuffix(plgName, ".zip")
	if err != nil {
		return plgName, plgImpl, err
	}
	defer r.Close()

	var manifestFile io.ReadCloser
	for _, f := range r.File {
		if f.Name != "manifest.json" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return plgName, plgImpl, err
		}
		manifestFile = rc
		break
	}
	if manifestFile == nil {
		return plgName, plgImpl, ErrNotFound
	}
	defer manifestFile.Close()
	if err = json.NewDecoder(manifestFile).Decode(&plgImpl); err != nil {
		return plgName, plgImpl, err
	}
	return plgName, plgImpl, nil
}
