package model

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
	. "github.com/mickael-kerjean/nuage/server/common"
	"log"
	"os"
	"path/filepath"
)

const DBCachePath = "data/"

type Share struct {
	Id      *string `json:"id"`
	Backend *string `json:"-"`
	Path    *string `json:"path"`
	Params  struct {
	} `json:"-"`
	Role         *string   `json:"role"`
	Password     *string   `json:"password,omitempty"`
	Users        *[]string `json:"-"`
	Expire       *int      `json:"expire,omitempty"`
	CanRead      *bool     `json:"-"`
	CanWrite     *bool     `json:"-"`
	CanUpload    *bool     `json:"-"`
	CanShare     *bool     `json:"can_share,omitempty"`
	CanManageOwn *bool     `json:"can_manage_own,omitempty"`
}

func init() {
	cachePath := filepath.Join(GetCurrentDir(), DBCachePath)
	os.MkdirAll(cachePath, os.ModePerm)

	db, err := sql.Open("sqlite3", cachePath+"/db.sql")
	if err != nil {
		return
	}
	stmt, err := db.Prepare("CREATE TABLE IF NOT EXISTS Location(backend VARCHAR(16), path VARCHAR(512), CONSTRAINT pk_location PRIMARY KEY(backend, path))")
	if err != nil {
		return
	}
	stmt.Exec()

	stmt, err = db.Prepare("CREATE TABLE IF NOT EXISTS Share(id VARCHAR(64) PRIMARY KEY, related_backend VARCHAR(16), related_path VARCHAR(512), params JSON, FOREIGN KEY (related_backend, related_path) REFERENCES Location(backend, path) ON UPDATE CASCADE ON DELETE CASCADE)")
	if err != nil {
		return
	}
	stmt.Exec()
}

func ShareList(p Share) []Share {
	db, err := getDb()
	if err != nil {
		return nil
	}
	log.Println("- backend: ", p.Backend)
	stmt, err := db.Prepare("SELECT s.id, l.path, s.params FROM Share as s LEFT JOIN Location as l ON l.backend = s.related_backend")
	log.Println("err1:", err)
	if err != nil {
		return nil
	}
	rows, err := stmt.Query()
	log.Println(">> ROWS::", rows)
	log.Println("err2:", err)
	if err != nil {
		return nil
	}
	defer rows.Close()

	sharedFiles := []Share{}
	for rows.Next() {
		var a Share
		//var params string
		rows.Scan(&a.Id, &a.Path, &a.Role)
		a.Role = NewString("viewer")
		sharedFiles = append(sharedFiles, a)
	}
	return sharedFiles
}

func ShareGet(p *Share) error {
	db, err := getDb()
	if err != nil {
		return err
	}
	stmt, err := db.Prepare("SELECT id, related_path, params FROM share WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()
	row := stmt.QueryRow(p.Id)
	row.Scan(&p.Id, &p.Path)
	return nil
}

func ShareUpsert(p Share) error {
	db, err := getDb()
	if err != nil {
		return err
	}

	stmt, err := db.Prepare("INSERT INTO Share(id, related_backend, related_path, params) VALUES($1, $2, $3, $4) ON CONFLICT(id) DO UPDATE SET related_backend = $,2s related_path = $3, params = $4")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(p.Id, p.Backend, p.Path, "{}")
	return err
}

func ShareDelete(p Share) error {
	db, err := getDb()
	if err != nil {
		return err
	}
	stmt, err := db.Prepare("DELETE FROM Share WHERE id = ?")
	if err != nil {
		return err
	}
	_, err = stmt.Exec(p.Id)
	return err
}

func getDb() (*sql.DB, error) {
	path := filepath.Join(GetCurrentDir(), DBCachePath) + "/db.sql"
	return sql.Open("sqlite3", path)
}

func shareToDBParams(s Share) string {
	return ""
}

func DPParamstoShare() Share {
	return Share{}
}
