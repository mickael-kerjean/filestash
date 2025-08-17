package plg_search_sqlitefts

import (
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.Onload(func() {
		SEARCH_ENABLE()
		SEARCH_EXCLUSION()
		SEARCH_PROCESS_MAX()
		SEARCH_PROCESS_PAR()
		SEARCH_REINDEX()
		CYCLE_TIME()
		MAX_INDEXING_FSIZE()
		INDEXING_EXT()
	})
}

var SEARCH_ENABLE = func() bool {
	return Config.Get("features.search.enable").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Name = "enable"
		f.Type = "enable"
		f.Target = []string{
			"process_max", "process_par", "reindex_time",
			"cycle_time", "max_size", "indexer_ext", "folder_exclusion",
		}
		f.Description = "Enable/Disable full text search"
		f.Placeholder = "Default: true"
		f.Default = true
		return f
	}).Bool()
}

var SEARCH_EXCLUSION = func() []string {
	listOfFolders := Config.Get("features.search.folder_exclusion").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "folder_exclusion"
		f.Name = "folder_exclusion"
		f.Type = "text"
		f.Description = "Exclude some specific folder from the crawl / index"
		f.Placeholder = "Default: node_modules,bower_components,.cache,.npm,.git"
		f.Default = "node_modules,bower_components,.cache,.npm,.git"
		return f
	}).String()
	out := []string{}
	for _, folder := range strings.Split(listOfFolders, ",") {
		out = append(out, strings.TrimSpace(folder))
	}
	return out
}

var SEARCH_PROCESS_MAX = func() int {
	return Config.Get("features.search.process_max").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "process_max"
		f.Name = "process_max"
		f.Type = "number"
		f.Description = "Size of the pool containing the indexers"
		f.Placeholder = "Default: 5"
		f.Default = 5
		return f
	}).Int()
}

var SEARCH_PROCESS_PAR = func() int {
	return Config.Get("features.search.process_par").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "process_par"
		f.Name = "process_par"
		f.Type = "number"
		f.Description = "How many concurrent indexers are running in the same time (requires a restart)"
		f.Placeholder = "Default: 2"
		f.Default = 2
		return f
	}).Int()
}

var SEARCH_REINDEX = func() int {
	return Config.Get("features.search.reindex_time").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "reindex_time"
		f.Name = "reindex_time"
		f.Type = "number"
		f.Description = "Time in hours after which we consider our index to be stale and needs to be reindexed"
		f.Placeholder = "Default: 24h"
		f.Default = 24
		return f
	}).Int()
}
var CYCLE_TIME = func() int {
	return Config.Get("features.search.cycle_time").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "cycle_time"
		f.Name = "cycle_time"
		f.Type = "number"
		f.Description = "Time the indexer needs to spend for each cycle in seconds (discovery, indexing and maintenance)"
		f.Placeholder = "Default: 10s"
		f.Default = 10
		return f
	}).Int()
}

var MAX_INDEXING_FSIZE = func() int {
	return Config.Get("features.search.max_size").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "max_size"
		f.Name = "max_size"
		f.Type = "number"
		f.Description = "Maximum size of files the indexer will perform full text search"
		f.Placeholder = "Default: 524288000 => 512MB"
		f.Default = 524288000
		return f
	}).Int()
}
var INDEXING_EXT = func() string {
	return Config.Get("features.search.indexer_ext").Schema(func(f *FormElement) *FormElement {
		if f == nil {
			f = &FormElement{}
		}
		f.Id = "indexer_ext"
		f.Name = "indexer_ext"
		f.Type = "text"
		f.Description = "Extensions that will be handled by the full text search engine"
		f.Placeholder = "Default: org,txt,docx,pdf,md,form"
		f.Default = "org,txt,docx,pdf,md,form"
		return f
	}).String()
}
