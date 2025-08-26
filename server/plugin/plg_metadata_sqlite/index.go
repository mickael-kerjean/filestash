package plg_metadata_sqlite

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	_ "modernc.org/sqlite"
)

func init() {
	db, err := sql.Open("sqlite", GetAbsolutePath(DB_PATH, "metadata.sql"))
	if err != nil {
		Log.Error("plg_metadata_sqlite - cannot open sqlite metadata db: %s", err.Error())
		os.Exit(1)
		return
	}
	db.Exec(`CREATE TABLE IF NOT EXISTS metadata (
        tenantID TEXT NOT NULL,
        path     TEXT NOT NULL,
        value    TEXT NOT NULL,
        PRIMARY KEY (tenantID, path)
    )`)
	Hooks.Register.Metadata(MetaImpl{db: db})
}

type MetaImpl struct {
	db *sql.DB
}

func (this MetaImpl) Get(ctx *App, path string) ([]FormElement, error) {
	tenantID := GenerateID(ctx.Session)
	forms := []FormElement{}
	var blob string
	err := this.db.QueryRowContext(ctx.Context, "SELECT value FROM metadata WHERE tenantID=? AND path = ?", tenantID, path).Scan(&blob)
	if err == sql.ErrNoRows {
		return forms, nil
	} else if err != nil {
		return forms, err
	}
	err = json.Unmarshal([]byte(blob), &forms)
	return forms, err
}

func (this MetaImpl) Set(ctx *App, path string, value []FormElement) error {
	tenantID := GenerateID(ctx.Session)
	if len(value) == 0 {
		_, err := this.db.Exec("DELETE FROM metadata WHERE tenantID=? AND path=?", tenantID, path)
		return err
	}
	blob, err := json.Marshal(value)
	if err != nil {
		return err
	}
	_, err = this.db.Exec(`
        INSERT INTO metadata (tenantID, path, value) VALUES (?, ?, ?)
        ON CONFLICT(tenantID, path) DO UPDATE SET value=excluded.value
    `, tenantID, path, string(blob))
	return err
}

func (this MetaImpl) Search(ctx *App, path string, facets map[string]any) (map[string][]FormElement, error) {
	tenantID := GenerateID(ctx.Session)
	rows, err := this.db.QueryContext(ctx.Context, `
	    SELECT path, value FROM metadata WHERE
	        tenantID=? AND
	        path LIKE ?
            ORDER BY path
	`, tenantID, path+"%")
	if err != nil {
		return nil, err
	}
	out := make(map[string][]FormElement)
	for rows.Next() {
		var (
			metapath  string
			metavalue []byte
			metaforms []FormElement
		)
		if err = rows.Scan(&metapath, &metavalue); err != nil {
			break
		}
		if err = json.Unmarshal(metavalue, &metaforms); err != nil {
			break
		}
		isResult := false
		for _, form := range metaforms {
			if form.Id == "" || facets[form.Id] == "" {
				continue
			}
			facetValues, ok := facets[form.Id].([]any)
			if !ok {
				continue
			}
			formValue := fmt.Sprintf("%s", form.Value)
			isOK := true
			for _, facetValue := range facetValues {
				if strings.Contains(formValue, fmt.Sprintf("%s", facetValue)) == false {
					isOK = false
					break
				}
			}
			if isOK {
				isResult = true
			}
		}
		if isResult {
			chroot := ctx.Session["path"]
			if key := strings.TrimPrefix(metapath, chroot); key != "" {
				if !strings.HasPrefix(key, "/") {
					key = "/" + key
				}
				out[key] = metaforms
			}
		}
	}
	rows.Close()
	return out, nil
}
