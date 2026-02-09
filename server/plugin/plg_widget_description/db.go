package plg_widget_description

import (
	"os"
	"database/sql"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var db *sql.DB

func init() {
	Hooks.Register.Onload(func() {
		if err := initDB(); err != nil {
			Log.Error("plg_widget_description::db err=cannot_init msg=%s", err.Error())
			os.Exit(1)
		}
	})
}

func initDB() error {
	var err error
	db, err = sql.Open("sqlite3", GetAbsolutePath(DB_PATH, "descriptions.db"))
	if err != nil {
		return err
	}
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS descriptions (
			backend TEXT NOT NULL,
			path TEXT NOT NULL,
			author TEXT NOT NULL,
			text TEXT NOT NULL,
			updated_at INTEGER NOT NULL,
			PRIMARY KEY (backend, path)
		);
	`)
	return err
}
