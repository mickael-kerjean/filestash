package plg_backend_psql

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"os"
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
		if columnComment := _findCommentColumn(this.ctx, this.db, l.table, columns[i].Name); columnComment != "" {
			forms[i].Description = columnComment
		}
		if slices.Contains(columns[i].Constraint, "PRIMARY KEY") && forms[i].Value != nil {
			forms[i].ReadOnly = true
		} else if slices.Contains(columns[i].Constraint, "FOREIGN KEY") {
			if link, err := _findRelation(this.ctx, this.db, columns[i]); err == nil {
				if len(link.values) > 0 {
					forms[i].Type = "select"
					forms[i].Opts = link.values
				}
				if forms[i].Description == "" {
					forms[i].Description = _createDescription(columns[i], link)
				}
			}
		} else if values, err := _findEnumValues(this.ctx, this.db, columns[i]); err == nil && len(values) > 0 {
			forms[i].Type = "select"
			forms[i].Opts = values
		}
	}
	if comment := _findCommentTable(this.ctx, this.db, l.table); comment != "" {
		forms = append([]FormElement{
			{
				Name:        "banner",
				Type:        "hidden",
				Description: comment,
			},
		}, forms...)
	}
	b, err := Form{Elmnts: forms}.MarshalJSON()
	if err != nil {
		return nil, err
	}
	return NewReadCloserFromBytes(b), nil
}

func (this PSQL) Stat(path string) (os.FileInfo, error) {
	return nil, ErrNotImplemented
}

func _createDescription(el Column, link LocationColumn) string {
	if slices.Contains(el.Constraint, "FOREIGN KEY") {
		return fmt.Sprintf("points to [<%s> → <%s>](/files/%s/)", link.table, link.column, link.table)
	}
	return ""
}

func _findCommentTable(ctx context.Context, db *sql.DB, tableName string) string {
	var comment string
	if err := db.QueryRowContext(ctx, `
		SELECT obj_description(c.oid)
				FROM pg_class c
				WHERE c.relname = $1 AND c.relkind = 'r'
	`, tableName).Scan(&comment); err != nil {
		return ""
	}
	return comment
}

func _findCommentColumn(ctx context.Context, db *sql.DB, tableName, columnName string) string {
	var comment string
	if err := db.QueryRowContext(ctx, `
		SELECT col_description(c.oid, a.attnum)
				FROM pg_class c
				JOIN pg_attribute a ON a.attrelid = c.oid
				WHERE c.relname = $1 AND a.attname = $2 AND c.relkind = 'r'
	`, tableName, columnName).Scan(&comment); err != nil {
		return ""
	}
	return comment
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

func _findEnumValues(ctx context.Context, db *sql.DB, el Column) ([]string, error) {
	var count int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
			FROM pg_type
			WHERE typname = $1 AND typtype = 'e'
	`, el.Type).Scan(&count); err != nil || count == 0 {
		return nil, err
	}
	rows, err := db.QueryContext(ctx, `SELECT unnest(enum_range(NULL::`+el.Type+`))`)
	if err != nil {
		return nil, err
	}
	values := []string{}
	for rows.Next() {
		var value string
		if err := rows.Scan(&value); err != nil {
			return nil, err
		}
		values = append(values, value)
	}
	rows.Close()
	return values, nil
}
