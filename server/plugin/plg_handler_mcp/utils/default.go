package utils

import (
	"fmt"
)

func ToString(val any, def string) string {
	if val == nil {
		return def
	} else if val == "" {
		return def
	}
	return fmt.Sprintf("%v", val)
}
