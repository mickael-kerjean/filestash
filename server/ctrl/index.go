package ctrl

import (
	"github.com/mickael-kerjean/filestash/server/pkg/files"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

// tmpl.go
var (
	TmplExec   = utils.TmplExec
	TmplParams = utils.TmplParams
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
