package runtime

import (
	"errors"
)

var ErrNoExport = errors.New("plugin: export not found")
