package token

import (
	_ "embed"
	"html/template"
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

//go:embed handler.html
var HTML string

func Handler(ctx *App, res http.ResponseWriter, req *http.Request) {
	if mode := req.Header.Get("Sec-Fetch-Mode"); mode != "" && mode != "navigate" {
        SendErrorResult(res, ErrNotAllowed)
        return
	}
	res.Header().Set("Content-Type", "text/html")
	res.Header().Set("Cache-Control", "no-store")
	res.Header().Set("X-Frame-Options", "DENY")
	res.Header().Set("Content-Security-Policy", "frame-ancestors 'none'")
	template.
		Must(template.New("app").Parse(Page(HTML))).
		Execute(
			res,
			struct {
				Token    string
			}{
				Token:    ctx.Authorization,
			},
		)
}
