package common

import (
	"bytes"
	"fmt"
	"io"
	slog "log"
	"os"
	"sync"
	"time"
)

var Log = &log{
	enable: true,
	out:    [2]io.Writer{io.Discard, io.Discard},
	buf: sync.Pool{
		New: func() any {
			return new(bytes.Buffer)
		},
	},
}

func InitLogger() (err error) {
	f, err := os.OpenFile(GetAbsolutePath(LOG_PATH, "access.log"), os.O_APPEND|os.O_WRONLY|os.O_CREATE, os.ModePerm)
	if err != nil {
		slog.Printf("ERROR log file: %+v", err)
		return err
	}
	f.WriteString("")
	Log.out[0] = f
	Log.out[1] = os.Stdout
	return nil
}

type log struct {
	enable bool
	debug  bool
	info   bool
	warn   bool
	error  bool

	out [2]io.Writer
	buf sync.Pool
}

func (l *log) Info(format string, v ...interface{}) {
	if l.info && l.enable {
		l.Stdout("SYST INFO "+format, v...)
	}
}

func (l *log) Warning(format string, v ...interface{}) {
	if l.warn && l.enable {
		l.Stdout("SYST WARN "+format, v...)
	}
}

func (l *log) Error(format string, v ...interface{}) {
	if l.error && l.enable {
		l.Stdout("SYST ERROR "+format, v...)
	}
}

func (l *log) Debug(format string, v ...interface{}) {
	if l.debug && l.enable {
		l.Stdout("SYST DEBUG "+format, v...)
	}
}

func (l *log) Stdout(format string, v ...interface{}) {
	buf := l.buf.Get().(*bytes.Buffer)
	defer l.buf.Put(buf)
	buf.Reset()
	fmt.Fprintf(buf, format, v...)
	l.Raw(buf.Bytes())
}

func (l *log) Raw(body []byte) {
	buf := l.buf.Get().(*bytes.Buffer)
	defer l.buf.Put(buf)
	buf.Reset()
	var ts [20]byte
	buf.Write(time.Now().AppendFormat(ts[:0], "2006/01/02 15:04:05"))
	buf.WriteByte(' ')
	buf.Write(body)
	buf.WriteByte('\n')
	b := buf.Bytes()
	for _, w := range l.out {
		w.Write(b)
	}
}

func (l *log) Close() {
	for _, w := range l.out {
		if c, ok := w.(io.Closer); ok {
			c.Close()
		}
	}
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
