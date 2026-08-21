package middleware

import (
	"net/http"
	"time"
	_ "unsafe"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/kernel"
)

func init() {
	Hooks.Register.Onload(func() {
		go func() {
			for {
				time.Sleep(10 * time.Second)
				telemetry.Flush()
			}
		}()
	})
}

func NewMiddlewareChain(fn HandlerFunc, m []Middleware) http.HandlerFunc {
	for i := len(m) - 1; i >= 0; i-- {
		fn = m[i](fn)
	}
	return func(res http.ResponseWriter, req *http.Request) {
		var (
			app  = App{Context: req.Context()}
			resw = NewResponseWriter(res)
		)
		fn(&app, &resw, req)
		if req.Body != nil {
			req.Body.Close()
		}
		logger(&app, &resw, req)
	}
}

type ResponseWriter struct {
	http.ResponseWriter
	status int
	start  int64
}

func NewResponseWriter(res http.ResponseWriter) ResponseWriter {
	return ResponseWriter{
		ResponseWriter: res,
		start:          now(),
	}
}

func (w *ResponseWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *ResponseWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = 200
	}
	return w.ResponseWriter.Write(b)
}

func (w *ResponseWriter) Status() int {
	return w.status
}

func (w *ResponseWriter) Flush() {
	w.ResponseWriter.(http.Flusher).Flush()
}

func PluginInjector(fn HandlerFunc) HandlerFunc {
	for _, middleware := range Hooks.Get.Middleware() {
		fn = middleware(fn)
	}
	return fn
}

//go:linkname now runtime.nanotime
func now() int64
