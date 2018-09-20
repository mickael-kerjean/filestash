package model

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
	. "github.com/mickael-kerjean/nuage/server/common"
	"path/filepath"
	"os"
)

var DB *sql.DB

const DBCachePath = "data/"

func init() {
	cachePath := filepath.Join(GetCurrentDir(), DBCachePath)
	os.MkdirAll(cachePath, os.ModePerm)
	var err error
	DB, err = sql.Open("sqlite3", cachePath+"/db.sql")
	if err != nil {
		return
	}
	stmt, err := DB.Prepare("CREATE TABLE IF NOT EXISTS Location(backend VARCHAR(16), path VARCHAR(512), CONSTRAINT pk_location PRIMARY KEY(backend, path))")
	if err != nil {
		return
	}
	stmt.Exec()

	stmt, err = DB.Prepare("CREATE TABLE IF NOT EXISTS Share(id VARCHAR(64) PRIMARY KEY, related_backend VARCHAR(16), related_path VARCHAR(512), params JSON, FOREIGN KEY (related_backend, related_path) REFERENCES Location(backend, path) ON UPDATE CASCADE ON DELETE CASCADE)")
	if err != nil {
		return
	}
	stmt.Exec()
}
