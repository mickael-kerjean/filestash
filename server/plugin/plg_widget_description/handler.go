package plg_widget_description

import (
	"database/sql"
	"net/http"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/ctrl"
)

func get(ctx *App, w http.ResponseWriter, r *http.Request) {
	path, err := PathBuilder(ctx, r.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(w, err)
		return
	}

	var d Description
	if err = db.QueryRowContext(ctx.Context, `
		SELECT author, text, updated_at
		FROM descriptions
		WHERE backend = ? AND path = ?
	`, GenerateID(ctx.Session), path).Scan(&d.Author, &d.Text, &d.UpdatedAt); err != nil && err != sql.ErrNoRows {
		SendErrorResult(w, err)
		return
	}
	SendSuccessResult(w, d)
}

func update(ctx *App, w http.ResponseWriter, r *http.Request) {
	path, err := PathBuilder(ctx, r.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	text, ok := ctx.Body["text"].(string)
	if !ok {
		SendErrorResult(w, NewError("Invalid parameters", 400))
		return
	}
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
