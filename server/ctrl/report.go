package ctrl

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
)

func ReportHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	// This function is quite dumb but that's only because the reporting logic is called before
	// this function is called.
	SendSuccessResult(res, nil)
}
