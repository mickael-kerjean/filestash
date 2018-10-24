package main

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"io"
	"net/http"
)

func Register(config *Config) []Plugin {
	config.Get("plugins.example.foo").Default("bar")

	return []Plugin{
		{
			Type: PROCESS_FILE_CONTENT_BEFORE_SEND, // where to hook our plugin in the request lifecycle
			Call: hook, // actual function we trigger
			Priority: 5, // determine execution order whilst multiple plugin type
		},
	}
}

func hook(file io.Reader, ctx *App, res *http.ResponseWriter, req *http.Request) (io.Reader, error){
	Log.Info("example plugin with config: '" + ctx.Config.Get("plugins.example.foo").String() + "'")
	return file, nil
}
