package httperr

import (
	"context"
	"net/http"
)

type onErrorIndexType int

const onErrorIndex onErrorIndexType = iota

// Middleware wraps the provided handler with middleware that captures errors which
// are returned from HandlerFunc, or reported via ReportError, and invokes the provided
// callback to render them. If the handler returns a status code >= 400, the response is
// captured and passed to OnError as a Response.
//
type Middleware struct {
	// OnError is a function that is called then a request fails with an error. If this function
	// returns nil, then the error is assumed to be handled. If it returns a non-nil error, then
	// that error is written to the client with Write()
	OnError func(w http.ResponseWriter, r *http.Request, err error) error

	// Handler is the next handler
	Handler http.Handler
}

func (m Middleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var unwrappedWriter = w
	var wrappedWriter *basicWriter
	if m.OnError != nil {
		wrappedWriter, w = wrapWriter(w)
	}

	var didCallOnError bool
	r = r.WithContext(context.WithValue(r.Context(), onErrorIndex, func(err error) {
		if m.OnError != nil {
			didCallOnError = true
			handlerErr := m.OnError(unwrappedWriter, r, err)
			if handlerErr != nil {
				Write(unwrappedWriter, r, handlerErr)
			}
		}
	}))

	m.Handler.ServeHTTP(w, r)

	if wrappedWriter != nil && wrappedWriter.statusCode >= 400 && !didCallOnError {
		err := Response(*wrappedWriter.copy)
		handlerErr := m.OnError(unwrappedWriter, r, err)
		if handlerErr != nil {
			Write(unwrappedWriter, r, handlerErr)
		}
	}
}

// ReportError reports the error to the function given in
// OnError.
func ReportError(r *http.Request, err error) {
	if v := r.Context().Value(onErrorIndex); v != nil {
		v.(func(error))(err)
	}
}
