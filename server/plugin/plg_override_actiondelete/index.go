package plg_override_actiondelete

import (
	_ "embed"

	. "github.com/mickael-kerjean/filestash/server/common"
)

//go:embed filespage_thing.diff
var PATCH []byte

func init() {
	Hooks.Register.StaticPatch(PATCH)
}
