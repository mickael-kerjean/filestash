package model

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

type StepDefinition struct {
	Name     string                 `json:"name"`
	Title    string                 `json:"title"`
	Subtitle string                 `json:"subtitle"`
	Icon     string                 `json:"icon"`
	Specs    map[string]FormElement `json:"specs"`
}
