package token

import (
	"strconv"
)

func cookieName(idx int) string {
	if idx == 0 {
		return COOKIE_NAME_SESSION
	}
	return COOKIE_NAME_SESSION + strconv.Itoa(idx)
}
