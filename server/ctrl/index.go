package ctrl

import (
	"github.com/mickael-kerjean/filestash/server/pkg/admin"
	"github.com/mickael-kerjean/filestash/server/pkg/files"
	"github.com/mickael-kerjean/filestash/server/pkg/frontend"
	"github.com/mickael-kerjean/filestash/server/pkg/kernel"
	"github.com/mickael-kerjean/filestash/server/pkg/session"
	"github.com/mickael-kerjean/filestash/server/pkg/share"
)

// tmpl.go
var (
	TmplExec   = kernel.TmplExec
	TmplParams = kernel.TmplParams
)

// files
var (
	FileLs         = files.FileLs
	FileCat        = files.FileCat
	FileAccess     = files.FileAccess
	FileSave       = files.FileSave
	FileMv         = files.FileMv
	FileRm         = files.FileRm
	FileMkdir      = files.FileMkdir
	FileTouch      = files.FileTouch
	FileDownloader = files.FileDownloader
	FileExtract    = files.FileExtract

	FileSearch = files.FileSearch
	MetaSearch = files.MetaSearch
	MetaGet    = files.MetaGet
	MetaUpsert = files.MetaUpsert
)

// admin
var (
	AdminSessionGet               = admin.AdminSessionGet
	AdminSessionAuthenticate      = admin.AdminSessionAuthenticate
	FetchAuditHandler             = admin.FetchAuditHandler
	FetchLogHandler               = admin.FetchLogHandler
	AdminBackend                  = admin.AdminBackend
	AdminAuthenticationMiddleware = admin.AdminAuthenticationMiddleware
	PrivateConfigHandler          = admin.PrivateConfigHandler
	PrivateConfigUpdateHandler    = admin.PrivateConfigUpdateHandler
)

// session
var (
	SessionGet            = session.SessionGet
	SessionAuthenticate   = session.SessionAuthenticate
	SessionLogout         = session.SessionLogout
	SessionOAuthBackend   = session.SessionOAuthBackend
	SessionAuthMiddleware = session.SessionAuthMiddleware
)

// share
var (
	ShareList        = share.ShareListHandler
	ShareDelete      = share.ShareDeleteHandler
	ShareUpsert      = share.ShareUpsertHandler
	ShareVerifyProof = share.ShareVerifyProofHandler
	WebdavHandler    = share.WebdavHandler
	WebdavBlacklist  = share.WebdavBlacklist
)

// frontend
var (
	ServeBackofficeHandler   = frontend.ServeBackofficeHandler
	ServeFrontofficeHandler  = frontend.ServeFrontofficeHandler
	ServeFavicon             = frontend.ServeFavicon
	ServeFile                = frontend.ServeFile
	ServeBundle              = frontend.ServeBundle
	NotFoundHandler          = frontend.NotFoundHandler
	ManifestHandler          = frontend.ManifestHandler
	RobotsHandler            = frontend.RobotsHandler
	CustomCssHandler         = frontend.CustomCssHandler
	AboutHandler             = frontend.AboutHandler
	InitPluginList           = frontend.InitPluginList
	HasPlugin                = frontend.HasPlugin
	PluginExportHandler      = frontend.PluginExportHandler
	PluginStaticHandler      = frontend.PluginStaticHandler
	PluginDownloadHandler    = frontend.PluginDownloadHandler
	ReportHandler            = frontend.ReportHandler
	WellKnownSecurityHandler = frontend.WellKnownSecurityHandler
	HealthHandler            = frontend.HealthHandler
	PublicConfigHandler      = frontend.PublicConfigHandler
)
