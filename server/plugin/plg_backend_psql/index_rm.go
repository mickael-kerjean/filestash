package plg_backend_psql

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func (this PSQL) Rm(path string) error {
	defer this.Close()
	l, err := getPath(path)
	if err != nil {
		return err
	} else if l.table == "" {
		return ErrNotFound
	}
	_, key, err := processTable(this.ctx, this.db, l.table)
	if err != nil {
		return err
	}
	_, err = this.db.ExecContext(
		this.ctx,
		`DELETE FROM "`+l.table+`" WHERE "`+key+`" = $1`,
		l.row,
	)
	return err
}
