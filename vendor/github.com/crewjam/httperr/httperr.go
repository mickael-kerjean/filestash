// Package httperr implements an error object that speaks HTTP.
package httperr

import (
	"errors"
	"net/http"

	pkgerrors "github.com/pkg/errors"
)

type statusCodeAndTexter interface {
	StatusCodeAndText() (int, string)
}

// StatusCodeAndText returns the status code and text of the error
func StatusCodeAndText(err error) (int, string) {
	if err == nil {
		return http.StatusOK, http.StatusText(http.StatusOK)
	}

	err = pkgerrors.Cause(err)

	var scater statusCodeAndTexter
	if errors.As(err, &scater) {
		return scater.StatusCodeAndText()
	}

	return http.StatusInternalServerError, http.StatusText(http.StatusInternalServerError)
}

// Writer is an interface for things that know how to write themselves
// to an error response. This interface is implemented by Private and
// Public to provide default error pages.
type Writer interface {
	error
	WriteError(w http.ResponseWriter, r *http.Request)
}

// Write writes the specified error to w. If err is a Writer, then
// it's WriteError method is invoked to produce the response.
// Otherwise a generic "500 Internal Server Error" is written.
func Write(w http.ResponseWriter, r *http.Request, err error) {
	err = pkgerrors.Cause(err)

	var errWriter Writer
	if errors.As(err, &errWriter) {
		errWriter.WriteError(w, r)
		return
	}

	genericErr := Value{
		Err:        err,
		StatusCode: http.StatusInternalServerError,
	}
	genericErr.WriteError(w, r)
}
