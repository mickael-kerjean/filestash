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
	files = append(files, File{
		FName: "keyword-" + keyword + ".txt",
		FType: "file", // ENUM("file", "directory")
		FSize: 42,
		FPath: "/fullpath/keyword-" + keyword + ".txt",
	})
	return files, nil
}
