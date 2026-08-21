package frontend

import (
	"net/http"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
)

func WellKnownSecurityHandler(ctx *App, res http.ResponseWriter, req *http.Request) {
	if IsWhiteLabel() {
		NotFoundHandler(ctx, res, req)
		return
	}
	res.WriteHeader(http.StatusOK)
	res.Write([]byte("# If you would like to report a security issue\n"))
	res.Write([]byte("# you may report it to me via email\n"))
	res.Write([]byte("Contact: support@filestash.app\n"))
}
