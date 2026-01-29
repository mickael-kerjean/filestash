//go:build !cgo

package sqlite

import (
	"errors"
	"database/sql"

	modernc "modernc.org/sqlite"
)

func init() {
	sql.Register("sqlite3", &modernc.Driver{})
}

func IsConstraint(err error) bool {
	if err == nil {
		return false
	}
	var sqliteErr *modernc.Error
	if !errors.As(err, &sqliteErr) {
		return false
	}
	code := sqliteErr.Code()
	return code == 19 || (code >= 1550 && code <= 1599)
}
