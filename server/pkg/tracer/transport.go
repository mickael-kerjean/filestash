package tracer

import (
	"fmt"
	"net/http"
)

func NewTransport(svc string, orig http.RoundTripper) http.RoundTripper {
	if svc == "" {
		return orig
	}
	return &transport{svc, orig}
}

type transport struct {
	svc  string
	orig http.RoundTripper
}

func (this *transport) RoundTrip(req *http.Request) (*http.Response, error) {
	span := StartSpan(TraceFromContext(req.Context()), req.Method+" "+req.URL.Path, SpanOptions{
		Kind:    KindClient,
		Service: this.svc,
		Attributes: map[string]string{
			"http.method": req.Method,
			"http.url":    req.URL.String(),
			"http.host":   req.URL.Host,
		},
	})
	defer span.Close()
	resp, err := this.orig.RoundTrip(req)
	if err != nil {
		span.SetError(err)
	} else if resp.StatusCode >= 400 {
		span.SetError(fmt.Errorf("status %d", resp.StatusCode))
	}
	return resp, err
}
