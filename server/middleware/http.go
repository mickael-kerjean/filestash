package middleware

import (
	"bytes"
	"encoding/json"
	"github.com/mickael-kerjean/nuage/server/model"
	. "github.com/mickael-kerjean/nuage/server/common"
	"io/ioutil"
	"net/http"
	"strings"
	"time"
)

func APIHandler(fn func(App, http.ResponseWriter, *http.Request), ctx App) http.HandlerFunc {
	return func(res http.ResponseWriter, req *http.Request) {
		var err error
		start := time.Now()

		header := res.Header()
		header.Add("Content-Type", "application/json")
		if ctx.Body, err = ExtractBody(req); err != nil {
			SendErrorResult(res, ErrNotValid)
			return
		}
		share_id := req.URL.Query().Get("share");
		if ctx.Share, err = ExtractShare(req, &ctx, share_id); err != nil {
			SendErrorResult(res, err)
			return
		}
		if ctx.Session, err = ExtractSession(req, &ctx); err != nil {
			SendErrorResult(res, err)
			return
		}
		if ctx.Backend, err = ExtractBackend(req, &ctx); err != nil {
			SendErrorResult(res, err)
			return
		}
		resw := ResponseWriter{ResponseWriter: res}
		fn(ctx, &resw, req)
		req.Body.Close()

		go func() {
			if Config.Get("log.telemetry").Bool() {
				go telemetry(req, &resw, start, ctx.Session["type"])
			}
			if Config.Get("log.enable").Bool() {
				go logger(req, &resw, start)
			}
		}()
	}
}

func ExtractBody(req *http.Request) (map[string]interface{}, error) {
	var body map[string]interface{}

	if req.Method != "POST" {
		return body, nil
	}

	if strings.HasPrefix(req.Header.Get("Content-Type"), "multipart/form-data") {
		return body, nil
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

func ExtractShare(req *http.Request, ctx *App, share_id string) (Share, error) {
	if share_id == "" {
		return Share{}, nil
	}

	if Config.Get("features.share.enable").Bool() == false {
		Log.Debug("Share feature isn't enable, contact your administrator")
		return Share{}, NewError("Feature isn't enable, contact your administrator", 405)
	}

	s, err := model.ShareGet(share_id)
	if err != nil {
		return Share{}, nil
	}
	if err = s.IsValid(); err != nil {
		return Share{}, err
	}
	return s, nil
}

func ExtractSession(req *http.Request, ctx *App) (map[string]string, error) {
	var str string
	var res map[string]string = make(map[string]string)

	if ctx.Share.Id != "" {
		var verifiedProof []model.Proof = model.ShareProofGetAlreadyVerified(req, ctx)
		var requiredProof []model.Proof = model.ShareProofGetRequired(ctx.Share)
		var remainingProof []model.Proof = model.ShareProofCalculateRemainings(requiredProof, verifiedProof)
		if len(remainingProof) != 0 {
			return res, NewError("Unauthorized Shared space", 400)
		}
		str = ctx.Share.Auth
		str, _ = DecryptString(SECRET_KEY, str)
		err := json.Unmarshal([]byte(str), &res)

		if ctx.Share.Path[len(ctx.Share.Path)-1:] == "/" {
			res["path"] = ctx.Share.Path
		} else {
			path := req.URL.Query().Get("path")
			if strings.HasSuffix(ctx.Share.Path, path) == false {
				return res, ErrPermissionDenied
			}
			res["path"] = strings.TrimSuffix(ctx.Share.Path, path) + "/"
		}
		return res, err
	} else {
		cookie, err := req.Cookie(COOKIE_NAME_AUTH)
		if err != nil {
			return res, nil
		}
		str = cookie.Value
		str, err = DecryptString(SECRET_KEY, str)
		if err != nil {
			// This typically happen when changing the secret key
			return res, nil
		}
		err = json.Unmarshal([]byte(str), &res)
		return res, err
	}
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
	Log.Info("HTTP %s %3d %03dms %s", point.Method, point.Status, point.Duration, point.RequestURI)
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
