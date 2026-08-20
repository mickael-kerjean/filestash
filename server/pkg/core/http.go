package core

import (
	"net/http"
)

type HandlerFunc func(*App, http.ResponseWriter, *http.Request)

type Middleware func(HandlerFunc) HandlerFunc
