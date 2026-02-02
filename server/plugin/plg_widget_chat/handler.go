package plg_widget_chat

import (
	"net/http"
	"strings"
	"time"
	"database/sql"

	. "github.com/mickael-kerjean/filestash/server/common"
)

func list(ctx *App, w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSpace(r.URL.Query().Get("path"))
	var (
		rows *sql.Rows
		err error
	)
	if path == "" {
		rows, err = db.QueryContext(r.Context(), `
			SELECT id, path, author, message, creation_date
			FROM messages
			ORDER BY creation_date DESC
			LIMIT 50
		`)
	} else {
		rows, err = db.QueryContext(r.Context(), `
			SELECT id, path, author, message, creation_date
			FROM messages
			WHERE path GLOB ?
			ORDER BY creation_date ASC
		`, globAll(path))
	}
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	defer rows.Close()

	out := []Message{}
	for rows.Next() {
		var m Message
		if err := rows.Scan(
			&m.ID,
			&m.Path,
			&m.Author,
			&m.Message,
			&m.CreatedAt,
		); err != nil {
			SendErrorResult(w, err)
			return
		}
		out = append(out, m)
	}
	SendSuccessResults(w, out)
}

func create(ctx *App, w http.ResponseWriter, r *http.Request) {
	path, ok := ctx.Body["path"].(string)
	if !ok {
		SendErrorResult(w, NewError("Invalid parameters", 400))
		return
	}
	msg, ok := ctx.Body["message"].(string)
	if !ok {
		SendErrorResult(w, NewError("Invalid parameters", 400))
		return
	}
	m := Message{
		ID:        newID(),
		Path:      path,
		Author:    getUser(ctx.Session),
		Message:   msg,
		CreatedAt: time.Now().Unix(),
	}
	_, err := db.ExecContext(ctx.Context, `
		INSERT INTO messages(id, path, author, message, creation_date)
		VALUES(?,?,?,?,?)
	`, m.ID, m.Path, m.Author, m.Message, m.CreatedAt)
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	SendSuccessResult(w, nil)
}
