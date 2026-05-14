package extension

var plugins = map[string]PluginImpl{}

type PluginImpl struct {
	Author  string              `json:"author"`
	Version string              `json:"version"`
	Modules []map[string]string `json:"modules"`
}

func All() map[string]PluginImpl {
	return plugins
}
