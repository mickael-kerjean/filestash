package model

import (
	"fmt"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/model/backend"
)

func NewBackend(ctx *App, conn map[string]string) (IBackend, error) {
	isAllowed := false
	for i := range ctx.Config.Connections {
		if ctx.Config.Connections[i].Type == conn["type"] {
			if ctx.Config.Connections[i].Hostname == nil {
				isAllowed = true
				break;
			}else if *ctx.Config.Connections[i].Hostname == conn["hostname"] {
				isAllowed = true
				break;
			}
		}
	}

	if isAllowed == false {
		return backend.NewNothing(conn, ctx)
	}
	
	switch conn["type"] {
	case "webdav":
		return backend.NewWebDav(conn, ctx)
	case "ftp":
		return backend.NewFtp(conn, ctx)
	case "sftp":
		return backend.NewSftp(conn, ctx)
	case "git":
		return backend.NewGit(conn, ctx)
	case "s3":
		return backend.NewS3(conn, ctx)
	case "dropbox":
		return backend.NewDropbox(conn, ctx)
	case "gdrive":
		return backend.NewGDrive(conn, ctx)
	case "custombackend":
		return backend.NewCustomBackend(conn, ctx)
	default:
		return backend.NewNothing(conn, ctx)
	}
	return nil, NewError("Invalid backend type", 501)
}

func GetHome(b IBackend) (string, error) {
	if obj, ok := b.(interface{ Home() (string, error) }); ok {
		return obj.Home()
	}

	_, err := b.Ls("/")
	return "", err
}

func MapStringInterfaceToMapStringString(m map[string]interface{}) map[string]string {
    res := make(map[string]string)
    for key, value := range m {
		res[key] = fmt.Sprintf("%v", value)
    }
	return res
}
