package common

import (
	"fmt"
	"net/http"
	"net"
	"time"
)

var USER_AGENT = fmt.Sprintf("Filestash/%s.%s (http://filestash.app)", APP_VERSION, BUILD_NUMBER)

var HTTPClient = http.Client{
	Timeout: 5 * time.Hour,
	Transport: NewTransormedTransport(http.Transport{
		Dial: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 10 * time.Second,
		}).Dial,
		TLSHandshakeTimeout:   5 * time.Second,
		IdleConnTimeout:       60 * time.Second,
		ResponseHeaderTimeout: 60 * time.Second,
	}),
}

var HTTP = http.Client{
	Timeout: 10000 * time.Millisecond,
	Transport: NewTransormedTransport(http.Transport{
		Dial: (&net.Dialer{
			Timeout:   5000 * time.Millisecond,
			KeepAlive: 5000 * time.Millisecond,
		}).Dial,
		TLSHandshakeTimeout:   5000 * time.Millisecond,
		IdleConnTimeout:       5000 * time.Millisecond,
		ResponseHeaderTimeout: 5000 * time.Millisecond,
	}),
}

func NewTransormedTransport(transport http.Transport) http.RoundTripper {
	return &transformedTransport{ &transport }
}
type transformedTransport struct {
	original http.RoundTripper
}
func (this *transformedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Add("User-Agent", USER_AGENT)
	return this.original.RoundTrip(req)
}
