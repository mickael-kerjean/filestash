package common

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/mickael-kerjean/filestash/server/pkg/tracer"
)

var USER_AGENT = fmt.Sprintf("Filestash/%s.%s (http://filestash.app)", APP_VERSION, BUILD_DATE)

func init() {
	if IsWhiteLabel() {
		USER_AGENT = APPNAME
	}
}

type httpClientConfig struct {
	transport    *http.Transport
	traceService string
}

type HTTPClientOption func(*httpClientConfig)

func WithInsecure(c *httpClientConfig) {
	c.transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
}

func WithoutTimeout(c *httpClientConfig) {
	c.transport.ResponseHeaderTimeout = 0
}

func WithTrace(service string) HTTPClientOption {
	return func(c *httpClientConfig) {
		c.traceService = service
	}
}

func HTTPClient(opts ...HTTPClientOption) *http.Client {
	cfg := &httpClientConfig{
		transport: &http.Transport{
			Dial: (&net.Dialer{
				Timeout:   10 * time.Second,
				KeepAlive: 10 * time.Second,
			}).Dial,
			TLSHandshakeTimeout:   5 * time.Second,
			IdleConnTimeout:       60 * time.Second,
			ResponseHeaderTimeout: 60 * time.Second,
		},
	}
	for _, opt := range opts {
		opt(cfg)
	}
	return &http.Client{
		Timeout:   5 * time.Hour,
		Transport: tracer.NewTransport(cfg.traceService, NewTransformedTransport(cfg.transport)),
	}
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
