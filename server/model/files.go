package model

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/model/backend"
)

func NewBackend(ctx *App, conn map[string]string) (IBackend, error) {
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
	default:
		return backend.NewNothing(conn, ctx)
	}
	return nil, NewError("Invalid backend type", 501)
}

func GetHome(b IBackend) (string, error) {
	obj, ok := b.(interface{ Home() (string, error) })
	if ok == false {
		_, err := b.Ls("/")
		return "", err
	}
	return obj.Home()
}
