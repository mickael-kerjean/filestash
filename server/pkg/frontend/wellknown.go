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
	res.Write([]byte("Contact: https://github.com/mickael-kerjean/filestash/security/advisories/new\n"))
	res.Write([]byte("Contact: mailto:support@filestash.app\n"))
	res.Write([]byte("Expires: 2029-12-31T23:59:59Z\n"))
}
