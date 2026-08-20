package extension

import (
	"path/filepath"
	"regexp"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var ListOfPlugins = struct {
	OSS        []string
	Enterprise []string
	Custom     []string
	Apps       []string
}{}

func InitPluginList(code []byte, plgs map[string]PluginImpl) error {
	listOfPackages := regexp.MustCompile(`\t_?\s*\"(github.com/[^\"]+)`).FindAllStringSubmatch(string(code), -1)
	for _, packageNameMatch := range listOfPackages {
		if len(packageNameMatch) != 2 {
			Log.Error("ctrl::static error=assertion_failed msg=invalid_match_size arg=%d", len(packageNameMatch))
			return ErrNotValid
		}
		packageName := packageNameMatch[1]
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
