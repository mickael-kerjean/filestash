package plg_widget_chat

import (
	"net/http"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	. "github.com/mickael-kerjean/filestash/server/ctrl"
)

func list(ctx *App, w http.ResponseWriter, r *http.Request) {
	path, err := PathBuilder(ctx, r.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	rows, err := db.QueryContext(r.Context(), `
		SELECT path, author, message, creation_date
			FROM messages
			WHERE path GLOB ?
			ORDER BY creation_date ASC
	`, globAll(path))
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	defer rows.Close()

	out := []Message{}
	for rows.Next() {
		var m Message
		if err := rows.Scan(
			&m.Path,
			&m.Author,
			&m.Message,
			&m.CreatedAt,
		); err != nil {
			SendErrorResult(w, err)
			return
		}
		if ctx.Session["path"] != "" {
			m.Path = strings.TrimPrefix(m.Path, strings.TrimSuffix(ctx.Session["path"], "/"))
		}
		out = append(out, m)
	}
	SendSuccessResults(w, out)
}

func create(ctx *App, w http.ResponseWriter, r *http.Request) {
	path, err := PathBuilder(ctx, r.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	msg, ok := ctx.Body["message"].(string)
	if !ok {
		SendErrorResult(w, NewError("Invalid parameters", 400))
		return
	}
	_, err = db.ExecContext(ctx.Context, `
		INSERT INTO messages(id, path, author, message, creation_date)
		VALUES(?,?,?,?,?)
	`, newID(), path, getUser(ctx.Session), msg, time.Now().Unix())
	if err != nil {
		SendErrorResult(w, err)
		return
	}
	SendSuccessResult(w, nil)
}
