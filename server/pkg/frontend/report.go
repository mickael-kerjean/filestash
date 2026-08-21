package frontend

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
)

func ReportHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	// This function is quite dumb indeed, the goal is to show a report trace in the logs
	SendSuccessResult(res, nil)
}
