package session

import (
	"net"
	"net/http"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

func backendID(session map[string]string) string {
	return Hash(GenerateID(session)+session["path"], 20)
}

func username(session map[string]string) string {
	if session["username"] != "" {
		return strings.ReplaceAll(session["username"], " ", "+")
	} else if session["user"] != "" {
		return strings.ReplaceAll(session["user"], " ", "+")
	}
	return GenerateID(session)
}

func ip(req *http.Request) string {
	if xff := req.Header.Get("X-Forwarded-For"); xff != "" {
		if parts := strings.Split(xff, ","); len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}
	if xrip := req.Header.Get("X-Real-Ip"); xrip != "" {
		return xrip
	}
	host, _, err := net.SplitHostPort(req.RemoteAddr)
	if err != nil {
		return req.RemoteAddr
	}
	return host
}

func ferror(err error) string {
	return strings.ReplaceAll(err.Error(), " ", "+")
}
