package common

import (
	"github.com/mickael-kerjean/filestash/server/pkg/admin"
	"github.com/mickael-kerjean/filestash/server/pkg/config"
	"github.com/mickael-kerjean/filestash/server/pkg/core"
	"github.com/mickael-kerjean/filestash/server/pkg/env"
	"github.com/mickael-kerjean/filestash/server/pkg/files"
	"github.com/mickael-kerjean/filestash/server/pkg/kernel"
	"github.com/mickael-kerjean/filestash/server/pkg/mime"
	"github.com/mickael-kerjean/filestash/server/pkg/share"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

type App = core.App
type Share = core.Share
type IBackend = core.IBackend
type Form = core.Form
type FormElement = core.FormElement
type ISpan = core.ISpan
type AuditQueryResult = core.AuditQueryResult
type IFile = core.IFile
type File = utils.File
type Metadata = core.Metadata
type IMetadata = core.IMetadata
type IAction = core.IAction
type ITrigger = core.ITrigger
type ITriggerEvent = core.ITriggerEvent
type WorkflowSpecs = core.WorkflowSpecs
type IAuthentication = core.IAuthentication
type Middleware = core.Middleware
type HandlerFunc = core.HandlerFunc

type AppError = utils.AppError
type AppCache = utils.AppCache

// plugin.go
var Hooks = kernel.Hooks

var (
	WithID  = kernel.WithID
	Backend = kernel.Backend
)

// log.go
var (
	Log          = utils.Log
	NewNilLogger = utils.NewNilLogger
)

// error.go
var (
	NewError = utils.NewError

	ErrNotFound             = utils.ErrNotFound
	ErrNotAllowed           = utils.ErrNotAllowed
	ErrPermissionDenied     = utils.ErrPermissionDenied
	ErrNotValid             = utils.ErrNotValid
	ErrConflict             = utils.ErrConflict
	ErrNotReachable         = utils.ErrNotReachable
	ErrInvalidPassword      = utils.ErrInvalidPassword
	ErrNotImplemented       = utils.ErrNotImplemented
	ErrNotSupported         = utils.ErrNotSupported
	ErrFilesystemError      = utils.ErrFilesystemError
	ErrMissingDependency    = utils.ErrMissingDependency
	ErrNotAuthorized        = utils.ErrNotAuthorized
	ErrAuthenticationFailed = utils.ErrAuthenticationFailed
	ErrCongestion           = utils.ErrCongestion
	ErrTimeout              = utils.ErrTimeout
	ErrInternal             = utils.ErrInternal

	HTTPFriendlyStatus = utils.HTTPFriendlyStatus
	HTTPError          = utils.HTTPError
	IsATranslatedError = utils.IsATranslatedError
)

// crypto.go
var (
	EncryptString = utils.EncryptString
	DecryptString = utils.DecryptString
	RandomString  = utils.RandomString
	DecryptAESGCM = utils.DecryptAESGCM
	EncryptAESGCM = utils.EncryptAESGCM

	QuickString = utils.QuickString
	QuickHash   = utils.QuickHash
	HashStream  = utils.HashStream
	Hash        = utils.Hash

	GenerateID = utils.GenerateID
)

// mime
var (
	AllMimeTypes = mime.AllMimeTypes
	GetMimeType  = mime.GetMimeType
)

// config
var (
	SaveConfig = config.SaveConfig
	InitConfig = config.InitConfig
)

// cache.go
var (
	NewAppCache   = utils.NewAppCache
	NewQuickCache = utils.NewQuickCache
)

// http.go
var (
	HTTP             = utils.HTTP
	HTTPClient       = utils.HTTPClient
	WithTrace        = utils.WithTrace
	WithInsecure     = utils.WithInsecure
	WithoutTimeout   = utils.WithoutTimeout
	DefaultTLSConfig = utils.DefaultTLSConfig
)

type HTTPClientOption = utils.HTTPClientOption

// convert.go
var (
	PrettyPrint                         = utils.PrettyPrint
	NewBool                             = utils.NewBool
	NewString                           = utils.NewString
	NewInt                              = utils.NewInt
	NewBoolFromInterface                = utils.NewBoolFromInterface
	NewInt64pFromInterface              = utils.NewInt64pFromInterface
	NewStringpFromInterface             = utils.NewStringpFromInterface
	NewStringFromInterface              = utils.NewStringFromInterface
	NewReadCloserFromBytes              = utils.NewReadCloserFromBytes
	NewReadCloserFromReader             = utils.NewReadCloserFromReader
	MapStringInterfaceToMapStringString = utils.MapStringInterfaceToMapStringString
)

// http.go
var (
	SendSuccessResult                = kernel.SendSuccessResult
	SendSuccessResults               = kernel.SendSuccessResults
	SendSuccessResultWithEtagAndGzip = kernel.SendSuccessResultWithEtagAndGzip
	SendSuccessResultsWithMetadata   = kernel.SendSuccessResultsWithMetadata
	SendErrorResult                  = kernel.SendErrorResult
	Page                             = kernel.Page
	RedirectPage                     = kernel.RedirectPage
	NotFoundHandler                  = kernel.NotFoundHandler
)

// path.go
var (
	GetCurrentDir    = utils.GetCurrentDir
	GetAbsolutePath  = utils.GetAbsolutePath
	IsDirectory      = utils.IsDirectory
	JoinPath         = utils.JoinPath
	EnforceDirectory = utils.EnforceDirectory
	SplitPath        = utils.SplitPath
	GlobMatch        = utils.GlobMatch
	SafeOsOpenFile   = utils.SafeOsOpenFile
	SafeOsMkdir      = utils.SafeOsMkdir
	SafeOsRemove     = utils.SafeOsRemove
	SafeOsRemoveAll  = utils.SafeOsRemoveAll
	SafeOsRename     = utils.SafeOsRename
	PathBuilder      = kernel.PathBuilder
)

// tmpl.go
var (
	TmplExec   = kernel.TmplExec
	TmplParams = kernel.TmplParams
)

// env
var (
	WithBase       = env.WithBase
	TrimBase       = env.TrimBase
	IsWhiteLabel   = env.IsWhiteLabel
	LicensedAs     = env.LicensedAs
	WithBrand      = env.WithBrand
	WhiteLabelText = env.WhiteLabelText
)

// files
var (
	NewBackend = files.NewBackend
	GetHome    = files.GetHome
)

// share
var (
	ShareAll    = share.ShareAll
	ShareList   = share.ShareList
	ShareDelete = share.ShareDelete
	ShareUpsert = share.ShareUpsert
)

// admin.go
var NewAdminToken = admin.NewAdminToken

func InitLogger() error {
	return utils.InitLogger(GetAbsolutePath(LOG_PATH, "access.log"))
}

var Config = config.Config
