package plg_backend_psql

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"slices"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func (this PSQL) Save(path string, file io.Reader) error {
	l, err := getPath(path)
	if err != nil {
		return err
	}
	columns, key, err := processTable(this.ctx, this.db, l.table)
	if err != nil {
		return err
	}
	f := map[string]FormElement{}
	if err := json.NewDecoder(file).Decode(&f); err != nil {
		return err
	}
	tx, err := this.db.BeginTx(this.ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	rows, err := tx.QueryContext(this.ctx, `SELECT * FROM "`+l.table+`" WHERE "`+key+`" = $1`, l.row)
	if err != nil {
		return err
	}
	i := 0
	dbvals := make([]any, len(columns))
	for rows.Next() {
		currentPtrs := make([]any, len(columns))
		for i := range dbvals {
			currentPtrs[i] = &dbvals[i]
		}
		if serr := rows.Scan(currentPtrs...); serr != nil {
			rows.Close()
			err = serr
			break
		} else if i >= 1 {
			err = ErrNotValid
			break
		}
		i += 1
	}
	rows.Close()
	if i == 0 {
		err = _createRow(tx, this.ctx, l.table, columns, f)
	}
	if err == nil && i == 1 {
		err = _updateRow(tx, this.ctx, l.table, columns, f, key, l.row, dbvals)
	}
	if err != nil {
		return err
	}
	return tx.Commit()
}

func _createRow(tx *sql.Tx, ctx context.Context, table string, columns []Column, f map[string]FormElement) error {
	colNames := []string{}
	placeholders := []string{}
	values := []interface{}{}
	paramIndex := 1
	for _, col := range columns {
		if formEl, exists := f[col.Name]; exists {
			if slices.Contains(col.Constraint, "PRIMARY KEY") && col.Default {
				continue
			}
			colNames = append(colNames, `"`+col.Name+`"`)
			placeholders = append(placeholders, fmt.Sprintf("$%d", paramIndex))
			values = append(values, formEl.Value)
			paramIndex++
		}
	}
	if len(colNames) == 0 {
		return ErrNotValid
	}
	_, err := tx.ExecContext(
		ctx,
		`INSERT INTO "`+table+`" (`+strings.Join(colNames, ", ")+`) VALUES (`+strings.Join(placeholders, ", ")+`)`,
		values...,
	)
	return err
}

func _updateRow(tx *sql.Tx, ctx context.Context, table string, columns []Column, f map[string]FormElement, keyName string, keyValue any, dbvals []any) error {
	for i, col := range columns {
		dbval := convertFromDB(dbvals[i])
		formval, ok := f[col.Name]
		if !ok || formval.Value == dbval {
			continue
		}
		if _, err := tx.ExecContext(
			ctx,
			`UPDATE "`+table+`" SET "`+col.Name+`" = $1 WHERE "`+keyName+`" = $2`,
			formval.Value, keyValue,
		); err != nil {
			return err
		}
	}
	return nil
}
