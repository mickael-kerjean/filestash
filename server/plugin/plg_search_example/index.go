package plg_search_example

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.SearchEngine(ExampleSearch{})
}

type ExampleSearch struct{}

func (this ExampleSearch) Query(app App, path string, keyword string) ([]IFile, error) {
	files := []IFile{}
	return files, nil
}
