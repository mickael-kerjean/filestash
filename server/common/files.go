package common

import (
	"path/filepath"
	"strings"

	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func PathBuilder(ctx *App, path string) (string, error) {
	if path == "" {
		return "", NewError("No path available", 400)
	}
	chroot := ctx.Session["path"]
	fullpath := filepath.ToSlash(filepath.Join(chroot, path))
	if strings.HasSuffix(path, "/") && fullpath != "/" {
		fullpath += "/"
	}

	if !strings.HasPrefix(fullpath, utils.EnforceDirectory(chroot)) {
		if strings.HasSuffix(chroot, "/") {
			return "", ErrFilesystemError
		}
		return chroot, nil
	} else if !strings.HasSuffix(chroot, "/") && strings.HasSuffix(chroot, path) {
		return chroot, nil
	}
	return fullpath, nil
}
