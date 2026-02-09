package plg_widget_description

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func get(ctx *App, w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSpace(r.URL.Query().Get("path"))
	if path == "" {
		SendErrorResult(w, NewError("Invalid parameters", 400))
		return
	}

	var d Description
	err := db.QueryRowContext(r.Context(), `
		SELECT path, author, text, updated_at
		FROM descriptions
		WHERE backend = ? AND path = ?
	`, GenerateID(ctx.Session), path).Scan(&d.Path, &d.Author, &d.Text, &d.UpdatedAt)

	if err == sql.ErrNoRows {
		SendSuccessResult(w, Description{
			Path: path,
			Text: "",
		})
		return
	}
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	SendSuccessResult(w, d)
}

func update(ctx *App, w http.ResponseWriter, r *http.Request) {
	path, ok := ctx.Body["path"].(string)
	if !ok {
		SendErrorResult(w, NewError("Invalid parameters", 400))
		return
	}
	text, ok := ctx.Body["text"].(string)
	if !ok {
		SendErrorResult(w, NewError("Invalid parameters", 400))
		return
	}
	var err error
	if text == "" {
		_, err = db.ExecContext(ctx.Context, `
			DELETE FROM descriptions WHERE backend = ? AND path = ?
		`, GenerateID(ctx.Session), path)
	} else {
		_, err = db.ExecContext(ctx.Context, `
			INSERT INTO descriptions(backend, path, author, text, updated_at)
			VALUES(?, ?, ?, ?, ?)
			ON CONFLICT(backend, path) DO UPDATE SET
				author = excluded.author,
				text = excluded.text,
				updated_at = excluded.updated_at
		`, GenerateID(ctx.Session), path, getUser(ctx.Session), text, time.Now().Unix())
	}
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	SendSuccessResult(w, nil)
}
