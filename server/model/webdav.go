package model

import (
	"os"
	"context"
	. "github.com/mickael-kerjean/nuage/server/common"
	"golang.org/x/net/webdav"
	//"log"
)

type WebdavFs struct {
	backend IBackend
}

func NewWebdavFs(b IBackend) WebdavFs {
	return WebdavFs{backend: b}
}

func (w WebdavFs) Mkdir(ctx context.Context, name string, perm os.FileMode) error {
	return w.backend.Mkdir(name)
}

func (w WebdavFs) OpenFile(ctx context.Context, name string, flag int, perm os.FileMode) (webdav.File, error) {
	f, err := os.OpenFile(name, flag, perm)
	if err != nil {
		return nil, err
	}
	return f, nil
}

func (w WebdavFs) RemoveAll(ctx context.Context, name string) error {
	return w.backend.Rm(name)
}

func (w WebdavFs) Rename(ctx context.Context, oldName, newName string) error {
	return w.backend.Mv(oldName, newName)
}

func (w WebdavFs) Stat(ctx context.Context, name string) (os.FileInfo, error) {
	files, err := w.backend.Ls(name)
	if err != nil {
		return nil, err
	}
	for i:=0; i < len(files); i++ {
		if files[i].Name() == "test" {
			return files[i], nil
		}
	}
	return nil, os.ErrNotExist
}
