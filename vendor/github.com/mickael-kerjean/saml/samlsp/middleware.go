package samlsp

import (
	"encoding/xml"
	"net/http"

	"github.com/mickael-kerjean/saml"
)

// Middleware implements middleware than allows a web application
// to support SAML.
//
// It implements http.Handler so that it can provide the metadata and ACS endpoints,
// typically /saml/metadata and /saml/acs, respectively.
//
// It also provides middleware RequireAccount which redirects users to
// the auth process if they do not have session credentials.
//
// When redirecting the user through the SAML auth flow, the middleware assigns
// a temporary cookie with a random name beginning with "saml_". The value of
// the cookie is a signed JSON Web Token containing the original URL requested
// and the SAML request ID. The random part of the name corresponds to the
// RelayState parameter passed through the SAML flow.
//
// When validating the SAML response, the RelayState is used to look up the
// correct cookie, validate that the SAML request ID, and redirect the user
// back to their original URL.
//
// Sessions are established by issuing a JSON Web Token (JWT) as a session
// cookie once the SAML flow has succeeded. The JWT token contains the
// authenticated attributes from the SAML assertion.
//
// When the middleware receives a request with a valid session JWT it extracts
// the SAML attributes and modifies the http.Request object adding a Context
// object to the request context that contains attributes from the initial
// SAML assertion.
//
// When issuing JSON Web Tokens, a signing key is required. Because the
// SAML service provider already has a private key, we borrow that key
// to sign the JWTs as well.
type Middleware struct {
	ServiceProvider saml.ServiceProvider
	OnError         func(w http.ResponseWriter, r *http.Request, err error)
	Binding         string // either saml.HTTPPostBinding or saml.HTTPRedirectBinding
	ResponseBinding string // either saml.HTTPPostBinding or saml.HTTPArtifactBinding
	RequestTracker  RequestTracker
	Session         SessionProvider
}

// ServeHTTP implements http.Handler and serves the SAML-specific HTTP endpoints
// on the URIs specified by m.ServiceProvider.MetadataURL and
// m.ServiceProvider.AcsURL.
func (m *Middleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == m.ServiceProvider.MetadataURL.Path {
		m.ServeMetadata(w, r)
		return
	}

	if r.URL.Path == m.ServiceProvider.AcsURL.Path {
		m.ServeACS(w, r)
		return
	}

	http.NotFoundHandler().ServeHTTP(w, r)
}

// ServeMetadata handles requests for the SAML metadata endpoint.
func (m *Middleware) ServeMetadata(w http.ResponseWriter, r *http.Request) {
	buf, _ := xml.MarshalIndent(m.ServiceProvider.Metadata(), "", "  ")
	w.Header().Set("Content-Type", "application/samlmetadata+xml")
	w.Write(buf)
	return
}

// ServeACS handles requests for the SAML ACS endpoint.
func (m *Middleware) ServeACS(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()

	possibleRequestIDs := []string{}
	if m.ServiceProvider.AllowIDPInitiated {
		possibleRequestIDs = append(possibleRequestIDs, "")
	}

	trackedRequests := m.RequestTracker.GetTrackedRequests(r)
	for _, tr := range trackedRequests {
		possibleRequestIDs = append(possibleRequestIDs, tr.SAMLRequestID)
	}

	assertion, err := m.ServiceProvider.ParseResponse(r, possibleRequestIDs)
	if err != nil {
		m.OnError(w, r, err)
		return
	}

	m.CreateSessionFromAssertion(w, r, assertion, m.ServiceProvider.DefaultRedirectURI)
	return
}

// RequireAccount is HTTP middleware that requires that each request be
// associated with a valid session. If the request is not associated with a valid
// session, then rather than serve the request, the middleware redirects the user
// to start the SAML auth flow.
func (m *Middleware) RequireAccount(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, err := m.Session.GetSession(r)
		if session != nil {
			r = r.WithContext(ContextWithSession(r.Context(), session))
			handler.ServeHTTP(w, r)
			return
		}
		if err == ErrNoSession {
			m.HandleStartAuthFlow(w, r)
			return
		}

		m.OnError(w, r, err)
		return
	})
}

// HandleStartAuthFlow is called to start the SAML authentication process.
func (m *Middleware) HandleStartAuthFlow(w http.ResponseWriter, r *http.Request) {
	// If we try to redirect when the original request is the ACS URL we'll
	// end up in a loop. This is a programming error, so we panic here. In
	// general this means a 500 to the user, which is preferable to a
	// redirect loop.
	if r.URL.Path == m.ServiceProvider.AcsURL.Path {
		panic("don't wrap Middleware with RequireAccount")
	}

	var binding, bindingLocation string
	if m.Binding != "" {
		binding = m.Binding
		bindingLocation = m.ServiceProvider.GetSSOBindingLocation(binding)
	} else {
		binding = saml.HTTPRedirectBinding
		bindingLocation = m.ServiceProvider.GetSSOBindingLocation(binding)
		if bindingLocation == "" {
			binding = saml.HTTPPostBinding
			bindingLocation = m.ServiceProvider.GetSSOBindingLocation(binding)
		}
	}

	authReq, err := m.ServiceProvider.MakeAuthenticationRequest(bindingLocation, binding, m.ResponseBinding)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// relayState is limited to 80 bytes but also must be integrity protected.
	// this means that we cannot use a JWT because it is way to long. Instead
	// we set a signed cookie that encodes the original URL which we'll check
	// against the SAML response when we get it.
	relayState, err := m.RequestTracker.TrackRequest(w, r, authReq.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if binding == saml.HTTPRedirectBinding {
		redirectURL, err := authReq.Redirect(relayState, &m.ServiceProvider)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Add("Location", redirectURL.String())
		w.WriteHeader(http.StatusFound)
		return
	}
	if binding == saml.HTTPPostBinding {
		w.Header().Add("Content-Security-Policy", ""+
			"default-src; "+
			"script-src 'sha256-AjPdJSbZmeWHnEc5ykvJFay8FTWeTeRbs9dutfZ0HqE='; "+
			"reflected-xss block; referrer no-referrer;")
		w.Header().Add("Content-type", "text/html")
		w.Write([]byte(`<!DOCTYPE html><html><body>`))
		w.Write(authReq.Post(relayState))
		w.Write([]byte(`</body></html>`))
		return
	}
	panic("not reached")
}

// CreateSessionFromAssertion is invoked by ServeHTTP when we have a new, valid SAML assertion.
func (m *Middleware) CreateSessionFromAssertion(w http.ResponseWriter, r *http.Request, assertion *saml.Assertion, redirectURI string) {
	if trackedRequestIndex := r.Form.Get("RelayState"); trackedRequestIndex != "" {
		trackedRequest, err := m.RequestTracker.GetTrackedRequest(r, trackedRequestIndex)
		if err != nil {
			m.OnError(w, r, err)
			return
		}
		m.RequestTracker.StopTrackingRequest(w, r, trackedRequestIndex)

		redirectURI = trackedRequest.URI
	}

	if err := m.Session.CreateSession(w, r, assertion); err != nil {
		m.OnError(w, r, err)
		return
	}

	http.Redirect(w, r, redirectURI, http.StatusFound)
}

// RequireAttribute returns a middleware function that requires that the
// SAML attribute `name` be set to `value`. This can be used to require
// that a remote user be a member of a group. It relies on the Claims assigned
// to to the context in RequireAccount.
//
// For example:
//
//	goji.Use(m.RequireAccount)
//	goji.Use(RequireAttributeMiddleware("eduPersonAffiliation", "Staff"))
func RequireAttribute(name, value string) func(http.Handler) http.Handler {
	return func(handler http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if session := SessionFromContext(r.Context()); session != nil {
				// this will panic if we have the wrong type of Session, and that is OK.
				sessionWithAttributes := session.(SessionWithAttributes)
				attributes := sessionWithAttributes.GetAttributes()
				if values, ok := attributes[name]; ok {
					for _, v := range values {
						if v == value {
							handler.ServeHTTP(w, r)
							return
						}
					}
				}
			}
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
		})
	}
}
