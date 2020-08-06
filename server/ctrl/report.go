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

func WellKnownSecurityHandler(ctx App, res http.ResponseWriter, req *http.Request) {
	res.WriteHeader(http.StatusOK)
	res.Write([]byte("# If you would like to report a security issue\n"))
	res.Write([]byte("# you may report it to me via email\n"))
	res.Write([]byte("Contact: mickael@kerjean.me"))
}
