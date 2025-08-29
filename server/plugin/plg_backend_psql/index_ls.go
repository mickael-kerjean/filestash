package plg_backend_psql

import (
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func (this PSQL) Ls(path string) ([]os.FileInfo, error) {
	l, err := getPath(path)
	if err != nil {
		Log.Debug("pl_backend_psql::ls method=getPath err=%s", err.Error())
		return nil, err
	}
	if l.table == "" {
		rows, err := this.db.QueryContext(this.ctx, `
            SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE'
        `)
		if err != nil {
			Log.Debug("plg_backend_psql::ls method=query err=%s", err.Error())
			return nil, err
		}
		defer rows.Close()
		out := []os.FileInfo{}
		for rows.Next() {
			var name string
			if err := rows.Scan(&name); err != nil {
				Log.Debug("plg_backend_psql::ls method=scan err=%s", err.Error())
				return nil, err
			}
			out = append(out, File{
				FName: name,
				FType: "directory",
			})
		}
		return out, nil
	} else if l.row == "" {
		_, key, err := processTable(this.ctx, this.db, l.table)
		if err != nil {
			Log.Debug("plg_backend_psql::ls method=processTable err=%s", err.Error())
			return nil, err
		}
		rows, err := this.db.QueryContext(this.ctx, `SELECT "`+key+`" FROM "`+l.table+`" LIMIT 500000`)
		if err != nil {
			Log.Debug("plg_backend_psql::ls method=query err=%s", err.Error())
			return nil, err
		}
		defer rows.Close()
		out := []os.FileInfo{}
		for rows.Next() {
			var name string
			if err := rows.Scan(&name); err != nil {
				Log.Debug("plg_backend_psql::ls method=scan err=%s", err.Error())
				return nil, err
			}
			out = append(out, File{
				FName: name + ".form",
				FType: "file",
			})
		}
		return out, nil
	}
	Log.Stdout("plg_backend_psql::ls err=invalid location=%v", l)
	return []os.FileInfo{}, ErrNotValid
}
