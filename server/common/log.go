package common

import (
	"time"
	slog "log"
)

type LogEntry struct {
	Host       string    `json:"host"`
	Method     string    `json:"method"`
	RequestURI string    `json:"pathname"`
	Proto      string    `json:"proto"`
	Status     int       `json:"status"`
	Scheme     string    `json:"scheme"`
	UserAgent  string    `json:"userAgent"`
	Ip         string    `json:"ip"`
	Referer    string    `json:"referer"`
	Timestamp  time.Time `json:"_id"`
	Duration   int64     `json:"responseTime"`
	Version    string    `json:"version"`
	Backend    string    `json:"backend"`
}

type log struct{
	enable bool

	debug  bool
	info   bool
	warn   bool
	error  bool
}

func (l *log) Info(str string) {
	if l.info && l.enable {
		slog.Printf("INFO %s\n", str)
	}
}

func (l *log) Warning(str string) {
	if l.warn && l.enable {
		slog.Printf("WARNING %s\n", str)
	}
}

func (l *log) Error(str string) {
	if l.error && l.enable {
		slog.Printf("ERROR %s\n", str)
	}
}

func (l *log) Debug(str string) {
	if l.debug && l.enable {
		slog.Printf("DEBUG %s\n", str)
	}
}

func (l *log) SetVisibility(str string) {
	switch str {
	case "WARN":
		l.debug = false
		l.info = false
		l.warn = true
		l.error = true
	case "ERROR":
		l.debug = false
		l.info = false
		l.warn = false
		l.error = true
	case "DEBUG":
		l.debug = true
		l.info = true
		l.warn = true
		l.error = true
	case "INFO":
		l.debug = false
		l.info = true
		l.warn = true
		l.error = true
	default:
		l.debug = false
		l.info = true
		l.warn = true
		l.error = true
	}
}

func(l *log) Enable(val bool) {
	l.enable = val
}

var Log = func () log {
	l := log{}
	l.SetVisibility("DEBUG")
	l.Enable(true)
	return l
}()
