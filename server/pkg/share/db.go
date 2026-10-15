package share

import (
	"database/sql"
	"time"

	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

var DB *sql.DB

func init() {
	Hooks.Register.Onload(func() {
		var err error
		if DB, err = sql.Open("sqlite3", GetAbsolutePath(DB_PATH)+"/share.sql"); err != nil {
			Log.Error("pkg::share::db action=open error=%q", err)
			return
		}
		DB.SetMaxOpenConns(1)
		if _, err = DB.Exec(`
            CREATE TABLE IF NOT EXISTS Share(
                id VARCHAR(64) PRIMARY KEY,
                related_backend VARCHAR(64),
                related_path VARCHAR(512),
                params JSON,
                auth VARCHAR(4093) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS Verification(
                key VARCHAR(512),
                code VARCHAR(16),
                expire DATETIME DEFAULT (datetime('now', '+10 minutes'))
            );
            CREATE INDEX IF NOT EXISTS idx_verification ON Verification(code, expire);
         `); err != nil {
			Log.Error("pkg::share::db action=init error=%q", err)
		}
		go autovacuum()
	})
}

func autovacuum() {
	for range time.Tick(time.Hour) {
		DB.Exec("DELETE FROM Verification WHERE expire < datetime('now')")
	}
}
