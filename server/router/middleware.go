package router

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/model"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func APIHandler(fn func(App, http.ResponseWriter, *http.Request), ctx App) http.HandlerFunc {
	return func(res http.ResponseWriter, req *http.Request) {
		start := time.Now()
		ctx.Body, _ = extractBody(req)
		ctx.Session, _ = extractSession(req, &ctx)
		ctx.Backend, _ = extractBackend(req, &ctx)
		res.Header().Add("Content-Type", "application/json")

		resw := ResponseWriter{ResponseWriter: res}
		fn(ctx, &resw, req)
		req.Body.Close()

		if ctx.Config.Log.Telemetry {
			go telemetry(req, &resw, start, ctx.Backend.Info())
		}
		if ctx.Config.Log.Enable {
			go logger(req, &resw, start)
		}
	}
}

func LoggedInOnly(fn func(App, http.ResponseWriter, *http.Request)) func(ctx App, res http.ResponseWriter, req *http.Request) {
	return func(ctx App, res http.ResponseWriter, req *http.Request) {
		if ctx.Backend == nil || ctx.Session == nil {
			sendErrorResult(res, NewError("Forbidden", 403))
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

func extractBody(req *http.Request) (map[string]string, error) {
	var body map[string]string
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

func extractSession(req *http.Request, ctx *App) (map[string]string, error) {
	cookie, err := req.Cookie(COOKIE_NAME)
	if err != nil {
		return make(map[string]string), err
	}
	return decrypt(ctx.Config.General.SecretKey, cookie.Value)
}

func extractBackend(req *http.Request, ctx *App) (IBackend, error) {
	return model.NewBackend(ctx, ctx.Session)
}

func telemetry(req *http.Request, res *ResponseWriter, start time.Time, backendType string) {
	if os.Getenv("ENV") != "dev" {
		point := logPoint(req, res, start, backendType)
		body, err := json.Marshal(point)
		if err != nil {
			return
		}
		formData := bytes.NewReader(body)

		r, _ := http.NewRequest("POST", "https://log.kerjean.me/nuage", formData)
		r.Header.Set("Content-Type", "application/json")
		HTTP.Do(r)
	}
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

func encrypt(keystr string, text map[string]string) (string, error) {
	key := []byte(keystr)
	plaintext, err := json.Marshal(text)
	if err != nil {
		return "", NewError("json marshalling: "+err.Error(), 500)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", NewError("encryption issue (cipher): "+err.Error(), 500)
	}
	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", NewError("encryption issue: "+err.Error(), 500)
	}
	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintext)
	return base64.URLEncoding.EncodeToString(ciphertext), nil
}

func decrypt(keystr string, cryptoText string) (map[string]string, error) {
	var raw map[string]string

	key := []byte(keystr)
	ciphertext, _ := base64.URLEncoding.DecodeString(cryptoText)
	block, err := aes.NewCipher(key)

	if err != nil || len(ciphertext) < aes.BlockSize {
		return raw, NewError("Cipher is too short", 500)
	}

	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]
	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)

	json.Unmarshal(ciphertext, &raw)
	return raw, nil
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
