package plg_widget_recent

import (
	"path/filepath"
	"strings"
	"time"
	"os"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func GetRecent(backendID string, user string) ([]os.FileInfo, error) {
	rows, err := db.Query(`
		SELECT path, last_accessed, size
		FROM recent
		WHERE backend = ? AND user = ?
		ORDER BY last_accessed DESC
		LIMIT 100
	`, backendID, user)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	files := make([]os.FileInfo, 0)
	for rows.Next() {
		file := File{
			FType: "file",
			FTime: -1,
			FSize: -1,
		}
		if err := rows.Scan(&file.FPath, &file.FTime, &file.FSize); err != nil {
			Log.Warning("plg_widget_recent::get err=%s", err.Error())
			continue
		}
		if strings.HasSuffix(file.FPath, "/") {
			file.FType = "directory"
		}
		file.FName = filepath.Base(strings.TrimSuffix(file.FPath, "/"))
		file.FTime *= 1000
		files = append(files, file)
	}
	return files, nil
}

func StoreRecent(backendID string, user string, path string, size int64) error {
	_, err := db.Exec(`
		INSERT INTO recent(backend, user, path, last_accessed, size) VALUES(?, ?, ?, ?, ?)
		ON CONFLICT(backend, user, path) DO UPDATE SET last_accessed = excluded.last_accessed
	`, backendID, user, path, time.Now().Unix(), size)
	if err != nil {
		Log.Warning("plg_widget_recent::store path=%s err=%s", path, err.Error())
		return err
	}
	return err
}

func RemoveRecent(backendID string, user string, path string) error {
	_, err := db.Exec(`
		DELETE FROM recent WHERE backend = ? AND user = ? AND path > ?
	`, backendID, user, path)
	if err != nil {
		Log.Warning("plg_widget_recent::remove path=%s err=%s", path, err.Error())
		return err
	}
	return nil
}
