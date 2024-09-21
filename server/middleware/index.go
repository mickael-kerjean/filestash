package middleware

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"net/http"
	"time"
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

func NewMiddlewareChain(fn HandlerFunc, m []Middleware, app App) http.HandlerFunc {
	return func(res http.ResponseWriter, req *http.Request) {
		var resw ResponseWriter = NewResponseWriter(res)
		var f func(*App, http.ResponseWriter, *http.Request) = fn
		for i := len(m) - 1; i >= 0; i-- {
			f = m[i](f)
		}
		app.Context = req.Context()
		f(&app, &resw, req)
		if req.Body != nil {
			req.Body.Close()
		}
		go logger(app, &resw, req)
	}
}

type ResponseWriter struct {
	http.ResponseWriter
	status int
	start  time.Time
}

func NewResponseWriter(res http.ResponseWriter) ResponseWriter {
	return ResponseWriter{
		ResponseWriter: res,
		start:          time.Now(),
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

func PluginInjector(fn HandlerFunc) HandlerFunc {
	for _, middleware := range Hooks.Get.Middleware() {
		fn = middleware(fn)
	}
	return fn
}
