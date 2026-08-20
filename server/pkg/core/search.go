package core

type ISearch interface {
	Query(ctx App, basePath string, term string) ([]IFile, error)
}
