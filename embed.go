package embed

import (
	"embed"
	"io/fs"
	"net/http"
	"os"

	. "github.com/mickael-kerjean/filestash/server/pkg/env"
)

var (
	//go:embed public
	wwwPublic embed.FS
	WWWPublic http.FileSystem = http.FS(os.DirFS("./public/"))
)

//go:embed server/plugin/index.go
var EmbedPluginList []byte

func init() {
	if !DEBUG {
		fsPublic, _ := fs.Sub(wwwPublic, "public")
		WWWPublic = http.FS(fsPublic)
	}
}
