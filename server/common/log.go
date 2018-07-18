package common

import (
	"fmt"
	"io"
	"io/ioutil"
	"time"
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

func Debug_reader(r io.Reader) {
	a, _ := ioutil.ReadAll(r)
	fmt.Println("> DEBUG:", string(a))
}
