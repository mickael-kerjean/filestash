package plg_backend_psql

import (
	"io"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func (this PSQL) Cat(path string) (io.ReadCloser, error) {
	defer this.db.Close()
	l, err := getPath(path)
	if err != nil {
		return nil, err
	}
	columnName, err := getKey(this.ctx, this.db, l.table)
	if err != nil {
		return nil, err
	}
	rows, err := this.db.QueryContext(this.ctx, `
        SELECT *
            FROM `+l.table+`
            WHERE `+columnName+`='`+l.row+`'
    `)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	c, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	t, err := rows.ColumnTypes()
	if err != nil {
		return nil, err
	}
	i := 0
	col := make([]any, len(c))
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
	for i, _ := range c {
		f := formType(t[i].ScanType(), c[i])
		f.Name = c[i]
		f.Value = col[i]
		forms[i] = f
	}
	b, err := Form{Elmnts: forms}.MarshalJSON()
	if err != nil {
		return nil, err
	}
	return NewReadCloserFromBytes(b), nil
}
