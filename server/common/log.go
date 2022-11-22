package common

import (
	"fmt"
	slog "log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var Log = func() ILogger {
	l := log{}
	l.Enable(true)
	return &l
}()
var logfile *os.File

func init() {
	var err error
	logPath := filepath.Join(GetCurrentDir(), LOG_PATH)
	logfile, err = os.OpenFile(filepath.Join(logPath, "access.log"), os.O_APPEND|os.O_WRONLY|os.O_CREATE, os.ModePerm)
	if err != nil {
		slog.Printf("ERROR log file: %+v", err)
		return
	}
	logfile.WriteString("")
}

type log struct {
	enable bool
	debug  bool
	info   bool
	warn   bool
	error  bool
}

func (l *log) Info(format string, v ...interface{}) {
	if l.info && l.enable {
		message := fmt.Sprintf("%s SYST INFO ", l.now())
		message = fmt.Sprintf(message+format+"\n", v...)

		logfile.WriteString(message)
		fmt.Printf(strings.Replace(message, "%", "%%", -1))
	}
}

func (l *log) Warning(format string, v ...interface{}) {
	if l.warn && l.enable {
		message := fmt.Sprintf("%s SYST WARN ", l.now())
		message = fmt.Sprintf(message+format+"\n", v...)

		logfile.WriteString(message)
		fmt.Printf(strings.Replace(message, "%", "%%", -1))
	}
}

func (l *log) Error(format string, v ...interface{}) {
	if l.error && l.enable {
		message := fmt.Sprintf("%s SYST ERROR ", l.now())
		message = fmt.Sprintf(message+format+"\n", v...)

		logfile.WriteString(message)
		fmt.Printf(strings.Replace(message, "%", "%%", -1))
	}
}

func (l *log) Debug(format string, v ...interface{}) {
	if l.debug && l.enable {
		message := fmt.Sprintf("%s SYST DEBUG ", l.now())
		message = fmt.Sprintf(message+format+"\n", v...)

		logfile.WriteString(message)
		fmt.Printf(strings.Replace(message, "%", "%%", -1))
	}
}

func (l *log) Stdout(format string, v ...interface{}) {
	message := fmt.Sprintf("%s ", l.now())
	message = fmt.Sprintf(message+format+"\n", v...)

	logfile.WriteString(message)
	fmt.Printf(strings.Replace(message, "%", "%%", -1))
}

func (l *log) now() string {
	return time.Now().Format("2006/01/02 15:04:05")
}

func (l *log) Close() {
	logfile.Close()
}

func (l *log) SetVisibility(str string) {
	switch str {
	case "WARNING":
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

func (l *log) Enable(val bool) {
	l.enable = val
}
