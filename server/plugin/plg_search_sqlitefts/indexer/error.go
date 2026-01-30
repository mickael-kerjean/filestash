package indexer

import (
	"database/sql"
	"fmt"

	"github.com/mickael-kerjean/filestash/server/pkg/sqlite"
)

var (
	ErrConstraint = fmt.Errorf("DB_CONSTRAINT_FAILED_ERROR")
	ErrNoRows     = fmt.Errorf("NO_ROWS")
)

func toErr(err error) error {
	if sqliteErr, ok := (err).(shasqlite3.Error); ok {
		if err == sql.ErrNoRows {
			return ErrNoRows
		} else if sqlite.IsConstraint(sqliteErr) {
			return ErrConstraint
		}
	}
	return err
}
