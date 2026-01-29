//go:build cgo

package sqlite

import (
	"github.com/mattn/go-sqlite3"
)

func IsConstraint(err error) bool {
	if err == nil {
		return false
	}
	var sqliteErr sqlite3.Error
	if !errors.As(err, &sqliteErr) {
		return false
	}
	if sqliteErr.Code == sqlite3.ErrConstraint {
		return true
	}
	switch sqliteErr.ExtendedCode {
	case sqlite3.ErrConstraintPrimaryKey,
		sqlite3.ErrConstraintUnique,
		sqlite3.ErrConstraintForeignKey,
		sqlite3.ErrConstraintCheck,
		sqlite3.ErrConstraintNotNull:
		return true
	}
	return false
}
