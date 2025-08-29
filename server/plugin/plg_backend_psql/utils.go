package plg_backend_psql

import (
	"context"
	"database/sql"
	"slices"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func getPath(path string) (LocationRow, error) {
	l := LocationRow{}
	for i, chunk := range strings.Split(path, "/") {
		if i == 0 {
			if chunk != "" {
				return l, ErrNotValid
			}
		} else if i == 1 {
			if strings.Contains(chunk, `"`) {
				return l, ErrNotValid
			}
			l.table = chunk
		} else if i == 2 {
			l.row = strings.TrimSuffix(chunk, ".form")
		} else {
			return l, ErrNotValid
		}
	}
	return l, nil
}

func processTable(ctx context.Context, db *sql.DB, table string) ([]Column, string, error) {
	columns, err := _getColumns(ctx, db, table)
	if err != nil {
		return nil, "", err
	}
	key := ""
	score := 0
	for _, column := range columns {
		if c := _calculateScore(column); c > score {
			key = column.Name
			score = c
		}
	}
	if key == "" {
		return columns, "", ErrNotValid
	}
	return columns, key, nil
}

func _getColumns(ctx context.Context, db *sql.DB, table string) ([]Column, error) {
	rows, err := db.QueryContext(ctx, `
        SELECT
            c.column_name,
            c.udt_name as type,
            (c.is_nullable = 'YES') AS nullable,
            (c.column_default IS NOT NULL) AS has_default,
            coalesce(string_agg(tc.constraint_type, ', '), '') as constraint
        FROM information_schema.columns AS c
        LEFT JOIN information_schema.key_column_usage kcu USING (table_name, column_name)
        LEFT JOIN information_schema.table_constraints tc USING (table_name, constraint_name)
        WHERE c.table_name = $1
        GROUP BY c.column_name, c.is_nullable, c.udt_name, c.column_default
        ORDER BY MIN(c.ordinal_position)
    `, table)
	if err != nil {
		return nil, err
	}
	columns := []Column{}
	for rows.Next() {
		var c Column
		var constraints string
		if err := rows.Scan(&c.Name, &c.Type, &c.Nullable, &c.Default, &constraints); err != nil {
			return nil, err
		}
		c.Constraint = strings.Split(constraints, ", ")
		c.Table = table
		columns = append(columns, c)
	}
	return columns, rows.Close()
}

func _calculateScore(column Column) int {
	scoreType := 0
	scoreName := 1
	if slices.Contains(column.Constraint, "PRIMARY KEY") {
		scoreType = 3
	} else if slices.Contains(column.Constraint, "UNIQUE") {
		scoreType = 2
	}
	switch strings.ToLower(column.Name) {
	case "name":
		scoreName = 2
	case "label":
		scoreName = 2
	case "email":
		scoreName = 5
	}
	return scoreType * scoreName
}

func convertFromDB(val any) any {
	switch tmp := val.(type) {
	case []byte:
		return string(tmp)
	case time.Time:
		return tmp.UTC().Format("2006-01-02T15:04")
	}
	return val
}

func createFormElement(val any, column Column) FormElement {
	f := FormElement{
		Type: "text",
	}
	switch val.(type) {
	case bool:
		f.Type = "boolean"
	case time.Time:
		f.Type = "datetime"
	}
	f.Value = convertFromDB(val)

	f.Name = column.Name
	f.Required = !column.Nullable && !column.Default

	if strings.Contains(strings.ToLower(column.Name), "password") {
		f.Type = "password"
	}
	return f
}
