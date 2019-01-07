package common

import (
	"net/http"
	"net"
	"time"
)

var HTTPClient = http.Client{
	Timeout: 5 * time.Hour,
	Transport: &http.Transport{
		Dial: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 10 * time.Second,
		}).Dial,
		TLSHandshakeTimeout:   5 * time.Second,
		IdleConnTimeout:       60 * time.Second,
		ResponseHeaderTimeout: 60 * time.Second,
	},
}

var HTTP = http.Client{
	Timeout: 10000 * time.Millisecond,
	Transport: &http.Transport{
		Dial: (&net.Dialer{
			Timeout:   5000 * time.Millisecond,
			KeepAlive: 5000 * time.Millisecond,
		}).Dial,
		TLSHandshakeTimeout:   5000 * time.Millisecond,
		IdleConnTimeout:       5000 * time.Millisecond,
		ResponseHeaderTimeout: 5000 * time.Millisecond,
	},
}
