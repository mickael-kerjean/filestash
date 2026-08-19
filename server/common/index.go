package common

import (
	"github.com/mickael-kerjean/filestash/server/pkg/core"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

type Form = core.Form
type FormElement = core.FormElement
type AppError = core.AppError
type AppCache = utils.AppCache

// log.go
var (
	Log          = core.Log
	NewNilLogger = utils.NewNilLogger
)

// error.go
var (
	NewError = core.NewError

	ErrNotFound             = core.ErrNotFound
	ErrNotAllowed           = core.ErrNotAllowed
	ErrPermissionDenied     = core.ErrPermissionDenied
	ErrNotValid             = core.ErrNotValid
	ErrConflict             = core.ErrConflict
	ErrNotReachable         = core.ErrNotReachable
	ErrInvalidPassword      = core.ErrInvalidPassword
	ErrNotImplemented       = core.ErrNotImplemented
	ErrNotSupported         = core.ErrNotSupported
	ErrFilesystemError      = core.ErrFilesystemError
	ErrMissingDependency    = core.ErrMissingDependency
	ErrNotAuthorized        = core.ErrNotAuthorized
	ErrAuthenticationFailed = core.ErrAuthenticationFailed
	ErrCongestion           = core.ErrCongestion
	ErrTimeout              = core.ErrTimeout
	ErrInternal             = core.ErrInternal

	HTTPFriendlyStatus = core.HTTPFriendlyStatus
	HTTPError          = core.HTTPError
	IsATranslatedError = core.IsATranslatedError
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

// path.go
var (
	GetCurrentDir    = utils.GetCurrentDir
	GetAbsolutePath  = utils.GetAbsolutePath
	IsDirectory      = utils.IsDirectory
	JoinPath         = utils.JoinPath
	EnforceDirectory = utils.EnforceDirectory
	SplitPath        = utils.SplitPath
	SafeOsOpenFile   = utils.SafeOsOpenFile
	SafeOsMkdir      = utils.SafeOsMkdir
	SafeOsRemove     = utils.SafeOsRemove
	SafeOsRemoveAll  = utils.SafeOsRemoveAll
	SafeOsRename     = utils.SafeOsRename
	GlobMatch        = utils.GlobMatch
)

func InitLogger() error {
	return core.InitLogger(GetAbsolutePath(LOG_PATH, "access.log"))
}
