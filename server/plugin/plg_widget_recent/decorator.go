package plg_widget_recent

import (
	"strings"
	"os"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

type Decorator struct {
	IBackend
	chroot string
}

func NewRecentDecorator(app *App) Decorator {
	return Decorator{app.Backend, EnforceDirectory(app.Session["path"])}
}

func (this Decorator) Ls(path string) ([]os.FileInfo, error) {
	files, err := this.IBackend.Ls(path)
	if err != nil {
		return nil, err
	}
	if strings.TrimPrefix(path, this.chroot) == "" {
		if folderName := PluginFolderName(); folderName != "" {
			files = append(files, File{
				FName: folderName,
				FType: "directory",
				FSize: 0,
				FTime: time.Now().Unix(),
			})
		}
	}
	return files, nil
}
