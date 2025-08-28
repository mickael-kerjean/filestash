package plg_backend_psql

import (
	"context"
	"database/sql"
	"reflect"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func getPath(path string) (Location, error) {
	l := Location{}
	for i, chunk := range strings.Split(path, "/") {
		if i == 0 {
			if chunk != "" {
				return l, ErrNotValid
			}
		} else if i == 1 {
			l.table = chunk
		} else if i == 2 {
			l.row = strings.TrimSuffix(chunk, ".form")
		} else {
			return l, ErrNotValid
		}
	}
	return l, nil
}

func getColumns(ctx context.Context, db *sql.DB, table string) ([]Column, error) {
	rows, err := db.QueryContext(ctx, `
        SELECT c.column_name, c.data_type, tc.constraint_type
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
            JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
            AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
            WHERE tc.table_name = $1
    `, table)
	if err != nil {
		return nil, err
	}
	columns := []Column{}
	for rows.Next() {
		var c Column
		if err := rows.Scan(&c.Name, &c.Type, &c.Type); err != nil {
			return nil, err
		}
		columns = append(columns, c)
	}
	return columns, nil
}

func getKey(ctx context.Context, db *sql.DB, table string) (string, error) {
	columns, err := getColumns(ctx, db, table)
	if err != nil {
		return "", err
	}
	key := ""
	score := 0
	for _, column := range columns {
		if c := calculateScore(column); c > score {
			key = column.Name
			score = c
		}
	}
	if key == "" {
		return "", ErrNotValid
	}
	return key, nil
}

func calculateScore(column Column) int {
	scoreType := 0
	scoreName := 1
	switch column.Type {
	case "PRIMARY KEY":
		scoreType = 3
	case "UNIQUE":
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

func formType(rt reflect.Type, label string) FormElement {
	switch rt.String() {
	case "bool":
		return FormElement{
			Type: "boolean",
		}
	case "time.Time":
		return FormElement{
			Type: "datetime",
		}
	}
	if strings.Contains(strings.ToLower(label), "password") {
		return FormElement{
			Type: "password",
		}
	}
	return FormElement{
		Type: "text",
	}
}
