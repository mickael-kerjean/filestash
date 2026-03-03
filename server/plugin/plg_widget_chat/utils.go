package plg_widget_chat

import (
	"crypto/rand"
	"encoding/hex"
)

func newID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

func getUser(session map[string]string) string {
	if session["username"] != "" {
		return session["username"]
	} else if session["user"] != "" {
		return session["user"]
	}
	return "unknown"
}

func globAll(path string) string {
	return path + "**"
}
