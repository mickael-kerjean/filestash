package plg_backend_psql

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"slices"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func (this PSQL) Cat(path string) (io.ReadCloser, error) {
	defer this.Close()
	l, err := getPath(path)
	if err != nil {
		return nil, err
	}
	columns, columnName, err := processTable(this.ctx, this.db, l.table)
	if err != nil {
		return nil, err
	}
	rows, err := this.db.QueryContext(this.ctx, `
        SELECT *
            FROM "`+l.table+`"
            WHERE "`+columnName+`"=$1
    `, l.row)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	c, err := rows.Columns()
	if err != nil {
		return nil, err
	} else if len(columns) != len(c) {
		Log.Error("plg_backend_psql::index_cat columns is not of the expected size columns[%d]=%v c[%d]=%v", len(columns), columns, len(c), c)
		return nil, ErrNotValid
	}
	i := 0
	col := make([]interface{}, len(c))
	for rows.Next() {
		if i != 0 {
			return nil, ErrNotValid
		}
		pcol := make([]any, len(c))
		for i, _ := range pcol {
			pcol[i] = &col[i]
		}
		if err := rows.Scan(pcol...); err != nil {
			return nil, err
		}
	}
	forms := make([]FormElement, len(c))
	for i, _ := range columns {
		forms[i] = createFormElement(col[i], columns[i])
		if slices.Contains(columns[i].Constraint, "PRIMARY KEY") {
			forms[i].ReadOnly = true
		} else if slices.Contains(columns[i].Constraint, "FOREIGN KEY") {
			if link, err := _findRelation(this.ctx, this.db, columns[i]); err == nil {
				forms[i].Description = _createDescription(columns[i], link)
				if len(link.values) > 0 {
					forms[i].Type = "select"
					forms[i].Opts = link.values
				}
			}
		}
	}
	b, err := Form{Elmnts: forms}.MarshalJSON()
	if err != nil {
		return nil, err
	}
	return NewReadCloserFromBytes(b), nil
}

func _createDescription(el Column, link LocationColumn) string {
	if slices.Contains(el.Constraint, "FOREIGN KEY") {
		return fmt.Sprintf("points to <%s> → <%s>", link.table, link.column)
	}
	return ""
}

func _findRelation(ctx context.Context, db *sql.DB, el Column) (LocationColumn, error) {
	l := LocationColumn{}
	rows, err := db.QueryContext(ctx, `
        SELECT ccu.table_name, ccu.column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu USING (constraint_name)
            JOIN information_schema.constraint_column_usage AS ccu USING (constraint_name)
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = $1
                AND kcu.column_name = $2
    `, el.Table, el.Name)
	if err != nil {
		return l, err
	}
	defer rows.Close()
	for rows.Next() {
		if err := rows.Scan(&l.table, &l.column); err != nil {
			return l, err
		}
	}
	valueRows, err := db.QueryContext(ctx, fmt.Sprintf(
		`SELECT DISTINCT "%s" FROM "%s" ORDER BY "%s" LIMIT 5000`,
		l.column, l.table, l.column,
	))
	if err != nil {
		return l, err
	}
	defer valueRows.Close()
	l.values = []string{}
	for valueRows.Next() {
		var value string
		if err := valueRows.Scan(&value); err != nil {
			return l, err
		}
		l.values = append(l.values, value)
	}
	return l, nil
}
