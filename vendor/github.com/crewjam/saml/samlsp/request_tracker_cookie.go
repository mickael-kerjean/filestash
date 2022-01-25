package samlsp

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/crewjam/saml"
)

var _ RequestTracker = CookieRequestTracker{}

// CookieRequestTracker tracks requests by setting a uniquely named
// cookie for each request.
type CookieRequestTracker struct {
	ServiceProvider *saml.ServiceProvider
	NamePrefix      string
	Codec           TrackedRequestCodec
	MaxAge          time.Duration
	RelayStateFunc  func(w http.ResponseWriter, r *http.Request) string
	SameSite        http.SameSite
}

// TrackRequest starts tracking the SAML request with the given ID. It returns an
// `index` that should be used as the RelayState in the SAMl request flow.
func (t CookieRequestTracker) TrackRequest(w http.ResponseWriter, r *http.Request, samlRequestID string) (string, error) {
	trackedRequest := TrackedRequest{
		Index:         base64.RawURLEncoding.EncodeToString(randomBytes(42)),
		SAMLRequestID: samlRequestID,
		URI:           r.URL.String(),
	}

	if t.RelayStateFunc != nil {
		relayState := t.RelayStateFunc(w, r)
		if relayState != "" {
			trackedRequest.Index = relayState
		}
	}

	signedTrackedRequest, err := t.Codec.Encode(trackedRequest)
	if err != nil {
		return "", err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     t.NamePrefix + trackedRequest.Index,
		Value:    signedTrackedRequest,
		MaxAge:   int(t.MaxAge.Seconds()),
		HttpOnly: true,
		SameSite: t.SameSite,
		Secure:   t.ServiceProvider.AcsURL.Scheme == "https",
		Path:     t.ServiceProvider.AcsURL.Path,
	})

	return trackedRequest.Index, nil
}

// StopTrackingRequest stops tracking the SAML request given by index, which is a string
// previously returned from TrackRequest
func (t CookieRequestTracker) StopTrackingRequest(w http.ResponseWriter, r *http.Request, index string) error {
	cookie, err := r.Cookie(t.NamePrefix + index)
	if err != nil {
		return err
	}
	cookie.Value = ""
	cookie.Domain = t.ServiceProvider.AcsURL.Hostname()
	cookie.Expires = time.Unix(1, 0) // past time as close to epoch as possible, but not zero time.Time{}
	http.SetCookie(w, cookie)
	return nil
}

// GetTrackedRequests returns all the pending tracked requests
func (t CookieRequestTracker) GetTrackedRequests(r *http.Request) []TrackedRequest {
	rv := []TrackedRequest{}
	for _, cookie := range r.Cookies() {
		if !strings.HasPrefix(cookie.Name, t.NamePrefix) {
			continue
		}

		trackedRequest, err := t.Codec.Decode(cookie.Value)
		if err != nil {
			continue
		}
		index := strings.TrimPrefix(cookie.Name, t.NamePrefix)
		if index != trackedRequest.Index {
			continue
		}

		rv = append(rv, *trackedRequest)
	}
	return rv
}

// GetTrackedRequest returns a pending tracked request.
func (t CookieRequestTracker) GetTrackedRequest(r *http.Request, index string) (*TrackedRequest, error) {
	cookie, err := r.Cookie(t.NamePrefix + index)
	if err != nil {
		return nil, err
	}

	trackedRequest, err := t.Codec.Decode(cookie.Value)
	if err != nil {
		return nil, err
	}
	if trackedRequest.Index != index {
		return nil, fmt.Errorf("expected index %q, got %q", index, trackedRequest.Index)
	}
	return trackedRequest, nil
}
