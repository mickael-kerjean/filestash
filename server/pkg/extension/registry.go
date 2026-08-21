package extension

import (
	"go/parser"
	"go/token"
	"path/filepath"
	"strconv"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

var ListOfPlugins = struct {
	OSS        []string
	Enterprise []string
	Custom     []string
	Apps       []string
}{}

func InitPluginList(code []byte, plgs map[string]PluginImpl) error {
	file, err := parser.ParseFile(token.NewFileSet(), "index.go", code, parser.ImportsOnly)
	if err != nil {
		Log.Error("extension::registry error=parse_failed err=%s", err.Error())
		return ErrNotValid
	}
	for _, spec := range file.Imports {
		if spec.Name == nil || spec.Name.Name != "_" {
			continue
		}
		packageName, err := strconv.Unquote(spec.Path.Value)
		if err != nil || strings.HasPrefix(packageName, "github.com/") == false {
			continue
		}
		packageShortName := filepath.Base(packageName)

		if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/server/plugin/") {
			ListOfPlugins.OSS = append(ListOfPlugins.OSS, packageShortName)
		} else if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/filestash-enterprise/plugins/") {
			ListOfPlugins.Enterprise = append(ListOfPlugins.Enterprise, packageShortName)
		} else if strings.HasPrefix(packageName, "github.com/mickael-kerjean/filestash/filestash-enterprise/customers/") {
			ListOfPlugins.Custom = append(ListOfPlugins.Custom, packageShortName)
		} else {
			ListOfPlugins.Custom = append(ListOfPlugins.Custom, packageShortName)
		}
	}
	for name, _ := range plgs {
		ListOfPlugins.Apps = append(ListOfPlugins.Apps, name)
	}
	return nil
}

func HasPlugin(list ...string) bool {
	for _, name := range list {
		for _, p := range ListOfPlugins.OSS {
			if p == name {
				return true
			}
		}
		for _, p := range ListOfPlugins.Enterprise {
			if p == name {
				return true
			}
		}
		for _, p := range ListOfPlugins.Custom {
			if p == name {
				return true
			}
		}
		for _, p := range ListOfPlugins.Apps {
			if p == name {
				return true
			}
		}
	}
	return false
}
