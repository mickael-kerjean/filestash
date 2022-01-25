package samlsp

import (
	"context"
	"errors"
	"net/http"

	"github.com/crewjam/saml"
)

// Session is an interface implemented to contain a session.
type Session interface{}

// SessionWithAttributes is a session that can expose the
// attributes provided by the SAML identity provider.
type SessionWithAttributes interface {
	Session
	GetAttributes() Attributes
}

// ErrNoSession is the error returned when the remote user does not have a session
var ErrNoSession = errors.New("saml: session not present")

// SessionProvider is an interface implemented by types that can track
// the active session of a user. The default implementation is CookieSessionProvider
type SessionProvider interface {
	// CreateSession is called when we have received a valid SAML assertion and
	// should create a new session and modify the http response accordingly, e.g. by
	// setting a cookie.
	CreateSession(w http.ResponseWriter, r *http.Request, assertion *saml.Assertion) error

	// DeleteSession is called to modify the response such that it removed the current
	// session, e.g. by deleting a cookie.
	DeleteSession(w http.ResponseWriter, r *http.Request) error

	// GetSession returns the current Session associated with the request, or
	// ErrNoSession if there is no valid session.
	GetSession(r *http.Request) (Session, error)
}

// SessionCodec is an interface to convert SAML assertions to a
// Session. The default implementation uses JWTs, JWTSessionCodec.
type SessionCodec interface {
	// New creates a Session from the SAML assertion.
	New(assertion *saml.Assertion) (Session, error)

	// Encode returns a serialized version of the Session.
	//
	// Note: When implementing this function, it is reasonable to expect that
	// Session is of the exact type returned by New(), and panic if it is not.
	Encode(s Session) (string, error)

	// Decode parses the serialized session that may have been returned by Encode
	// and returns a Session.
	Decode(string) (Session, error)
}

type indexType int

const sessionIndex indexType = iota

// SessionFromContext returns the session associated with ctx, or nil
// if no session are associated
func SessionFromContext(ctx context.Context) Session {
	v := ctx.Value(sessionIndex)
	if v == nil {
		return nil
	}
	return v.(Session)
}

// ContextWithSession returns a new context with session associated
func ContextWithSession(ctx context.Context, session Session) context.Context {
	return context.WithValue(ctx, sessionIndex, session)
}

// AttributeFromContext is a convenience method that returns the named attribute
// from the session, if available.
func AttributeFromContext(ctx context.Context, name string) string {
	s := SessionFromContext(ctx)
	if s == nil {
		return ""
	}
	sa, ok := s.(SessionWithAttributes)
	if !ok {
		return ""
	}
	return sa.GetAttributes().Get(name)
}
