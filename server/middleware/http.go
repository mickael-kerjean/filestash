package middleware

import (
	"bytes"
	"encoding/json"
	"github.com/mickael-kerjean/nuage/server/model"
	"github.com/mickael-kerjean/mux"
	. "github.com/mickael-kerjean/nuage/server/common"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
	"time"
)

func APIHandler(fn func(App, http.ResponseWriter, *http.Request), ctx App) http.HandlerFunc {
	return func(res http.ResponseWriter, req *http.Request) {
		start := time.Now()
		ctx.Body, _ = ExtractBody(req)
		ctx.Session, _ = ExtractSession(req, &ctx)

		ctx.Backend, _ = ExtractBackend(req, &ctx)
		res.Header().Add("Content-Type", "application/json")

		resw := ResponseWriter{ResponseWriter: res}
		fn(ctx, &resw, req)
		req.Body.Close()

		go func() {
			if ctx.Config.Get("log.telemetry").Bool() {
				go telemetry(req, &resw, start, ctx.Backend.Info())
			}
			if ctx.Config.Get("log.enable").Bool() {
				go logger(req, &resw, start)
			}
		}()
	}
}

func LoggedInOnly(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		if ctx.Backend == nil || ctx.Session == nil {
			SendErrorResult(res, NewError("Forbidden", 403))
			return
		}
		fn(ctx, res, req)
	}
}

func CtxInjector(fn func(App, http.ResponseWriter, *http.Request), ctx App) http.HandlerFunc {
	return http.HandlerFunc(func(res http.ResponseWriter, req *http.Request) {
		fn(ctx, res, req)
	})
}

func ExtractBody(req *http.Request) (map[string]interface{}, error) {
	var body map[string]interface{}
	if strings.HasPrefix(req.Header.Get("Content-Type"), "multipart/form-data") {
		return body, NewError("", 200)
	}
	byt, err := ioutil.ReadAll(req.Body)
	if err != nil {
		return body, err
	}
	if err := json.Unmarshal(byt, &body); err != nil {
		return body, err
	}
	return body, nil
}

func ExtractSession(req *http.Request, ctx *App) (map[string]string, error) {
	var str string
	var res map[string]string
	
	if req.URL.Query().Get("share") != "" || mux.Vars(req)["share"] != "" {
		share_id := req.URL.Query().Get("share")
		if share_id == "" {
			share_id = mux.Vars(req)["share"]
		}
		
		s := model.NewShare(share_id)
		if err := model.ShareGet(&s); err != nil {
			return make(map[string]string), err
		}
		if _, err := s.IsValid(); err != nil {
			return make(map[string]string), err
		}

		var verifiedProof []model.Proof = model.ShareProofGetAlreadyVerified(req, ctx)
		var requiredProof []model.Proof = model.ShareProofGetRequired(s)
		var remainingProof []model.Proof = model.ShareProofCalculateRemainings(requiredProof, verifiedProof)
		if len(remainingProof) != 0 {
			return make(map[string]string), NewError("Unauthorized Shared space", 400)
		}
		str = s.Auth
	} else {
		cookie, err := req.Cookie(COOKIE_NAME_AUTH)
		if err != nil {
			return res, nil
		}
		str = cookie.Value
	}

	str, _ = DecryptString(ctx.Config.Get("general.secret_key").String(), str)
	err := json.Unmarshal([]byte(str), &res)
	return res, err
}

func ExtractBackend(req *http.Request, ctx *App) (IBackend, error) {
	return model.NewBackend(ctx, ctx.Session)
}

func telemetry(req *http.Request, res *ResponseWriter, start time.Time, backendType string) {
	point := logPoint(req, res, start, backendType)
	body, err := json.Marshal(point)
	if err != nil {
		return
	}
	formData := bytes.NewReader(body)

	r, err := http.NewRequest("POST", "https://log.kerjean.me/nuage", formData)
	r.Header.Set("Connection", "Close")
	r.Close = true
	if err != nil {
		r.Header.Set("Content-Type", "application/json")
	}
	resp, err := HTTP.Do(r)
	if err != nil {
		return
	}
	resp.Body.Close()
}

func logger(req *http.Request, res *ResponseWriter, start time.Time) {
	point := logPoint(req, res, start, "")
	log.Printf("%s %d %d %s %s\n", "INFO", point.Duration, point.Status, point.Method, point.RequestURI)
}

func logPoint(req *http.Request, res *ResponseWriter, start time.Time, backendType string) *LogEntry {
	return &LogEntry{
		Version:    APP_VERSION,
		Scheme:     req.URL.Scheme,
		Host:       req.Host,
		Method:     req.Method,
		RequestURI: req.RequestURI,
		Proto:      req.Proto,
		Status:     res.status,
		UserAgent:  req.Header.Get("User-Agent"),
		Ip:         req.RemoteAddr,
		Referer:    req.Referer(),
		Duration:   int64(time.Now().Sub(start) / (1000 * 1000)),
		Timestamp:  time.Now().UTC(),
		Backend:    backendType,
	}
}

type ResponseWriter struct {
	http.ResponseWriter
	status int
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
