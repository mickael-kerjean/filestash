package common

import (
	"time"
	"log"
)

const (
	LOG_INFO = "INFO"
	LOG_WARNING = "WARNING"
	LOG_ERROR = "ERROR"
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

func Log(ctx *App, str string, level string){
	if ctx.Config.Log.Enable == false {
		return
	}

	shouldDisplay := func(r string, l string) bool {
		levels := []string{"DEBUG", "INFO", "WARNING", "ERROR"}

		configLevel := -1
		currentLevel := 0

		for i:=0; i <= len(levels); i++ {
			if levels[i] == l {
				currentLevel = i
			}
			if levels[i] == r {
				configLevel = i
				break
			}
		}

		if currentLevel <= configLevel {
			return true
		}
		return false
	}(ctx.Config.Log.Level, level)

	if shouldDisplay {
		log.Printf("%s %s\n", level, str)
	}
}
