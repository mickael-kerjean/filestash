package middleware

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strconv"
	"sync"

	. "github.com/mickael-kerjean/filestash/server/pkg/config"
	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

var (
	telemetry = Telemetry{Data: make([]LogEntry, 0)}
	version   = APP_VERSION + "." + BUILD_DATE
)

type Telemetry struct {
	Data []LogEntry
	mu   sync.Mutex
}

type LogEntry struct {
	Host       string `json:"host"`
	Method     string `json:"method"`
	RequestURI string `json:"pathname"`
	Proto      string `json:"proto"`
	Status     int    `json:"status"`
	Scheme     string `json:"scheme"`
	UserAgent  string `json:"userAgent"`
	Ip         string `json:"ip"`
	Referer    string `json:"referer"`
	Duration   int    `json:"responseTime"`
	Version    string `json:"version"`
	Backend    string `json:"backend"`
	Share      string `json:"share"`
	License    string `json:"license"`
	Session    string `json:"session"`
	RequestID  string `json:"requestID"`
}

func logger(ctx *App, res *ResponseWriter, req *http.Request) {
	if req.RequestURI == "/about" {
		return
	}
	point := LogEntry{
		Version:    version,
		License:    LICENSE,
		Scheme:     req.URL.Scheme,
		Host:       req.Host,
		Method:     req.Method,
		RequestURI: req.RequestURI,
		Proto:      req.Proto,
		Status:     res.status,
		UserAgent:  req.Header.Get("User-Agent"),
		Ip:         req.RemoteAddr,
		Referer:    req.Referer(),
		Duration:   int((now() - res.start) / (100_000)),
		Backend: func() string {
			if ctx.Session["type"] == "" {
				return "null"
			}
			return ctx.Session["type"]
		}(),
		Share: func() string {
			if ctx.Share.Id == "" {
				return "null"
			}
			return ctx.Share.Id
		}(),
		Session: func() string {
			if ctx.Session["type"] == "" {
				return "null"
			}
			return GenerateID(ctx.Session)
		}(),
		RequestID: res.Header().Get("X-Request-Id"),
	}
	if Config.Get("log.telemetry").Bool() {
		telemetry.Record(point)
	}
	if Config.Get("log.enable").Bool() {
		var (
			arr [512]byte
			num [32]byte
		)
		buf := bytes.NewBuffer(arr[:0])
		buf.WriteString("HTTP ")
		buf.Write(strconv.AppendInt(num[:0], int64(point.Status), 10))
		buf.WriteByte(' ')
		buf.WriteString(point.Method)
		buf.WriteByte(' ')
		buf.Write(strconv.AppendInt(num[:0], int64(point.Duration/10), 10))
		buf.WriteByte('.')
		buf.Write(strconv.AppendInt(num[:0], int64(point.Duration%10), 10))
		buf.WriteString("ms ")
		if uri := point.RequestURI; len(uri) > 200 {
			buf.WriteString(uri[:200])
			buf.WriteString("...")
		} else {
			buf.WriteString(uri)
		}
		buf.WriteByte(' ')
		if point.RequestID != "" && Config.Get("log.level").String() == "DEBUG" {
			buf.WriteString("trace=")
			buf.WriteString(point.RequestID)
		}
		Log.Raw(buf.Bytes())
	}
}

func (this *Telemetry) Record(point LogEntry) {
	point.Duration *= 10
	this.mu.Lock()
	this.Data = append(this.Data, point)
	this.mu.Unlock()
}

func (this *Telemetry) Flush() {
	if len(this.Data) == 0 {
		return
	}
	this.mu.Lock()
	pts := this.Data
	this.Data = make([]LogEntry, 0)
	this.mu.Unlock()

	body, err := json.Marshal(pts)
	if err != nil {
		return
	}
	r, err := http.NewRequest("POST", "https://downloads.filestash.app/event", bytes.NewReader(body))
	r.Header.Set("Connection", "Close")
	r.Header.Set("Content-Type", "application/json")
	r.Close = true
	if err != nil {
		return
	}
	resp, err := HTTP.Do(r)
	if err != nil {
		return
	}
	resp.Body.Close()
}
