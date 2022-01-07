// Package httperr implements an error object that speaks HTTP.
package httperr

import (
	"fmt"
	"net/http"
)

// Value is an Error that returns that status and code
// provided, and reveals the underlying wrapper error to
// the caller. The text of the error is rendered to the
// client in the body of the response, as well as in
// the X-Error header.
type Value struct {
	Err        error  // the underlying error
	StatusCode int    // the HTTP status code. If not supplied, http.StatusInternalServerError is used.
	Status     string // the HTTP status text. If not supplied, http.StatusText(http.StatusCode) is used.
	Public     bool
	Header     http.Header // extra headers to add to the response (optional)
}

// StatusCodeAndText returns the status code and text of the error
func (e Value) StatusCodeAndText() (int, string) {
	if e.StatusCode == 0 {
		e.StatusCode = http.StatusInternalServerError
	}

	if e.Status == "" {
		if e.Err != nil && e.Public {
			e.Status = e.Err.Error()
		} else {
			e.Status = http.StatusText(e.StatusCode)
		}
	}

	return e.StatusCode, e.Status
}

func (e Value) Error() string {
	statusCode, statusText := StatusCodeAndText(e)
	if e.Public {
		return fmt.Sprintf("%d %s", statusCode, statusText)
	}
	return fmt.Sprintf("%d %s: %s", statusCode, statusText, e.Err.Error())
}

// WriteError writes an error response to w using the specified status code.
func (e Value) WriteError(w http.ResponseWriter, r *http.Request) {
	for key, values := range e.Header {
		w.Header().Del(key) // overwrite headers already in the response with the ones specified
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}

	code, message := e.StatusCodeAndText()
	http.Error(w, message, code)
}

// Unwrap unwraps the Value error and returns the underlying error`
func (e Value) Unwrap() error {
	return e.Err
}

var _ error = Value{}
var _ Writer = Value{}
var _ statusCodeAndTexter = Value{}
