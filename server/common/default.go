package common

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"time"
)

var USER_AGENT = fmt.Sprintf("Filestash/%s (Custom build)", APP_VERSION)

var HTTPClient = http.Client{
	Timeout: 5 * time.Hour,
	Transport: NewTransformedTransport(&http.Transport{
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
	Transport: NewTransformedTransport(&http.Transport{
		Dial: (&net.Dialer{
			Timeout:   5000 * time.Millisecond,
			KeepAlive: 5000 * time.Millisecond,
		}).Dial,
		TLSHandshakeTimeout:   5000 * time.Millisecond,
		IdleConnTimeout:       5000 * time.Millisecond,
		ResponseHeaderTimeout: 5000 * time.Millisecond,
	}),
}

var DefaultTLSConfig = tls.Config{
	MinVersion: tls.VersionTLS12,
	CipherSuites: []uint16{
		tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
		tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
		tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
		tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
		tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
	},
	PreferServerCipherSuites: true,
	CurvePreferences: []tls.CurveID{
		tls.CurveP256,
		tls.X25519,
	},
}

func NewTransformedTransport(transport *http.Transport) http.RoundTripper {
	return &TransformedTransport{transport}
}

type TransformedTransport struct {
	Orig http.RoundTripper
}

func (this *TransformedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Add("User-Agent", USER_AGENT)
	return this.Orig.RoundTrip(req)
}
