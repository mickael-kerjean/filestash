package indexer

import (
	"database/sql"
	"fmt"

	"github.com/mattn/go-sqlite3"
)

var (
	ErrConstraint = fmt.Errorf("DB_CONSTRAINT_FAILED_ERROR")
	ErrNoRows     = fmt.Errorf("NO_ROWS")
)

func toErr(err error) error {
	if sqliteErr, ok := (err).(sqlite3.Error); ok {
		if err == sql.ErrNoRows {
			return ErrNoRows
		} else if sqliteErr.Code == sqlite3.ErrConstraint {
			return ErrConstraint
		}
	}
	return err
}
