package core

type IMetadata interface {
	Get(ctx *App, path string) ([]FormElement, error)
	Set(ctx *App, path string, value []FormElement) error
	Search(ctx *App, path string, facets map[string]any) (map[string][]FormElement, error)
}
