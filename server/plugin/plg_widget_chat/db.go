package plg_widget_chat

import (
	"os"
	"database/sql"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var db *sql.DB

func init() {
	Hooks.Register.Onload(func() {
		if err := initDB(); err != nil {
			Log.Error("plg_handler_chat::db err=cannot_init msg=%s", err.Error())
			os.Exit(1)
		}
	})
}

func initDB () error {
	var err error
	db, err = sql.Open("sqlite3", GetAbsolutePath(DB_PATH, "chat.db"))
	if err != nil {
		return err
	}
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS messages (
			id TEXT PRIMARY KEY,
			path TEXT NOT NULL,
			author TEXT NOT NULL,
			message TEXT NOT NULL,
			creation_date INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_messages ON messages(path, creation_date);
	`)
	return err
}
