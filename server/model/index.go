package model

import (
	"database/sql"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

var DB *sql.DB

func init() {
	Hooks.Register.Onload(func() {
		var err error
		if DB, err = sql.Open("sqlite3", GetAbsolutePath(DB_PATH)+"/share.sql?_fk=true"); err != nil {
			Log.Error("model::index sqlite open error '%s'", err.Error())
			return
		}

		if stmt, err := DB.Prepare("CREATE TABLE IF NOT EXISTS Location(backend VARCHAR(16), path VARCHAR(512), CONSTRAINT pk_location PRIMARY KEY(backend, path))"); err == nil {
			stmt.Exec()
		}

		if stmt, err := DB.Prepare("CREATE TABLE IF NOT EXISTS Share(id VARCHAR(64) PRIMARY KEY, related_backend VARCHAR(16), related_path VARCHAR(512), params JSON, auth VARCHAR(4093) NOT NULL, FOREIGN KEY (related_backend, related_path) REFERENCES Location(backend, path) ON UPDATE CASCADE ON DELETE CASCADE)"); err == nil {
			stmt.Exec()
		}

		if stmt, err := DB.Prepare("CREATE TABLE IF NOT EXISTS Verification(key VARCHAR(512), code VARCHAR(4), expire DATETIME DEFAULT (datetime('now', '+10 minutes')))"); err == nil {
			stmt.Exec()
			if stmt, err = DB.Prepare("CREATE INDEX idx_verification ON Verification(code, expire)"); err == nil {
				stmt.Exec()
			}
		}

		go func() {
			autovacuum()
		}()
	})
}

func autovacuum() {
	if stmt, err := DB.Prepare("DELETE FROM Verification WHERE expire < datetime('now')"); err == nil {
		stmt.Exec()
	}
	time.Sleep(6 * time.Hour)
}
