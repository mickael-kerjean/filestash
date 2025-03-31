package utils

import (
	"net/http"
)

func WithCors(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "mcp-protocol-version, Content-Type")
}
