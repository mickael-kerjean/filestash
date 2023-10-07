package embed

import (
	"embed"
	"io/fs"
	"net/http"
	"os"
)

var (
	//go:embed public
	wwwPublic embed.FS
	WWWPublic http.FileSystem = http.FS(os.DirFS("./public/"))
)

//go:embed server/plugin/index.go
var EmbedPluginList []byte

func init() {
	if os.Getenv("DEBUG") != "true" {
		fsPublic, _ := fs.Sub(wwwPublic, "public")
		WWWPublic = http.FS(fsPublic)
	}
}
