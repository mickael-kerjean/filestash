package common

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"net/http"
	"strings"
)

type APISuccessResult struct {
	Status string      `json:"status"`
	Result interface{} `json:"result,omitempty"`
}

type APISuccessResults struct {
	Status  string      `json:"status"`
	Results interface{} `json:"results"`
}

type APISuccessResultsWithMetadata struct {
	Status   string      `json:"status"`
	Results  interface{} `json:"results"`
	Metadata interface{} `json:"metadata,omitempty"`
}

type APIErrorMessage struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

func SendSuccessResult(res http.ResponseWriter, data interface{}) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	encoder.Encode(APISuccessResult{"ok", data})
}

func SendSuccessResultWithEtagAndGzip(res http.ResponseWriter, req *http.Request, data interface{}) {
	dataToSend, _ := json.Marshal(APISuccessResult{"ok", data})
	mode := "normal"
	if strings.Contains(req.Header.Get("Accept-Encoding"), "gzip") == true {
		mode = "gzip"
	}
	hash := QuickHash(mode + string(dataToSend), 20)
	if req.Header.Get("If-None-Match") == hash {
		res.WriteHeader(http.StatusNotModified)
		return
	}
	head := res.Header()
	head.Set("Etag", hash)
	if mode == "gzip" {
		head.Set("Content-Encoding", "gzip")

		var b bytes.Buffer
		w, _ := gzip.NewWriterLevel(&b, 1)
		w.Write(dataToSend)
		w.Close()
		dataToSend = b.Bytes()
	}
	res.Write(dataToSend)
}


func SendSuccessResults(res http.ResponseWriter, data interface{}) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	encoder.Encode(APISuccessResults{"ok", data})
}

func SendSuccessResultsWithMetadata(res http.ResponseWriter, data interface{}, p interface{}) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	encoder.Encode(APISuccessResultsWithMetadata{"ok", data, p})
}

func SendErrorResult(res http.ResponseWriter, err error) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	obj, ok := err.(interface{ Status() int })
	if ok == true {
		res.WriteHeader(obj.Status())
	} else {
		res.WriteHeader(http.StatusInternalServerError)
	}
	m := func(r string) string {
		if r == "" {
			return r
		}
		return strings.ToUpper(string(r[0])) + string(r[1:])
	}(err.Error())
	encoder.Encode(APIErrorMessage{"error", m})
}

func Page(stuff string) string {
	return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
    <style>
      html { background: #f4f4f4; color: #455164; font-size: 16px; font-family: -apple-system,system-ui,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif; }
      body { text-align: center; padding-top: 50px; text-align: center; }
      h1 { font-weight: 200; line-height: 1em; font-size: 40px; }
      p { opacity: 0.8; font-size: 1.05em; }
    </style>
  </head>
  <body>
    ` + stuff + `
  </body>
</html>`
}
