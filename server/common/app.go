package common

import (
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type App struct {
	Config  *Config
	Helpers *Helpers
	Backend IBackend
	Body    map[string]string
	Session map[string]string
}

func GetCurrentDir() string {
	ex, _ := os.Executable()
	return filepath.Dir(ex)
}

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
	Timeout: 800 * time.Millisecond,
	Transport: &http.Transport{
		Dial: (&net.Dialer{
			Timeout:   500 * time.Millisecond,
			KeepAlive: 500 * time.Millisecond,
		}).Dial,
		TLSHandshakeTimeout:   500 * time.Millisecond,
		IdleConnTimeout:       500 * time.Millisecond,
		ResponseHeaderTimeout: 500 * time.Millisecond,
	},
}
