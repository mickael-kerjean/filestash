package plg_backend_psql

import (
	"os"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func (this PSQL) Ls(path string) ([]os.FileInfo, error) {
	defer this.Close()
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
		columns, key, err := processTable(this.ctx, this.db, l.table)
		if err != nil {
			return nil, err
		}
		query := `SELECT "` + key + `", NULL FROM "` + l.table + `" LIMIT 500000`
		for _, c := range columns {
			if c.Type == "timestamptz" {
				query = `SELECT "` + key + `", "` + c.Name + `" FROM "` + l.table + `" LIMIT 500000`
				break
			}
		}
		rows, err := this.db.QueryContext(this.ctx, query)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		out := []os.FileInfo{}
		for rows.Next() {
			var name string
			var t *time.Time
			if err = rows.Scan(&name, &t); err != nil {
				return nil, err
			}
			out = append(out, File{
				FName: name + ".form",
				FType: "file",
				FTime: func() int64 {
					if t == nil {
						return 0
					}
					return t.Unix()
				}(),
				FSize: -1,
			})
		}
		return out, nil
	}
	return []os.FileInfo{}, ErrNotValid
}
