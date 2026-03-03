package plg_widget_recent

import (
	"os"
	"database/sql"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var db *sql.DB

func init() {
	Hooks.Register.Onload(func() {
		if err := initDB(); err != nil {
			Log.Error("plg_widget_recent::db err=cannot_init msg=%s", err.Error())
			os.Exit(1)
		}
	})
}

func initDB() (err error) {
	db, err = sql.Open("sqlite3", GetAbsolutePath(DB_PATH, "recent.db"))
	if err != nil {
		return err
	}
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS recent (
			backend TEXT NOT NULL,
			user TEXT NOT NULL,
			path TEXT NOT NULL,
			last_accessed INTEGER NOT NULL,
			size INTEGER DEFAULT 0,
			PRIMARY KEY (backend, user, path)
		);
		CREATE INDEX IF NOT EXISTS idx_recent_lookup ON recent(backend, user, last_accessed DESC);
	`)
	return err
}
