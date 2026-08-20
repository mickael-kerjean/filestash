package model

import (
	_ "github.com/mickael-kerjean/filestash/server/pkg/admin"
	"github.com/mickael-kerjean/filestash/server/pkg/files"
	"github.com/mickael-kerjean/filestash/server/pkg/share"
	"github.com/mickael-kerjean/filestash/server/pkg/sqlite"
)

var DB = sqlite.DB

var (
	NewBackend = files.NewBackend
	GetHome    = files.GetHome
)

var (
	ShareAll    = share.All
	ShareList   = share.List
	ShareDelete = share.Delete
	ShareUpsert = share.Upsert
)
