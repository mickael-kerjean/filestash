package common

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"net/http"
	"strings"
)

const IndentSize = "    "

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
	Metadata interface{} `json:"permissions,omitempty"`
}

type APIErrorMessage struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

func SendSuccessResult(res http.ResponseWriter, data interface{}) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	if shouldIndentResponse(res) {
		encoder.SetIndent("", IndentSize)
	}
	encoder.Encode(APISuccessResult{"ok", data})
}

func SendSuccessResultWithEtagAndGzip(res http.ResponseWriter, req *http.Request, data interface{}) {
	var dataToSend []byte
	var err error
	if shouldIndentResponse(res) {
		if dataToSend, err = json.MarshalIndent(APISuccessResult{"ok", data}, "", IndentSize); err != nil {
			Log.Warning("common::response Marshal %s", err.Error())
			dataToSend = []byte("{}")
		}
	} else {
		if dataToSend, err = json.Marshal(APISuccessResult{"ok", data}); err != nil {
			Log.Warning("common::response Marshal %s", err.Error())
			dataToSend = []byte("{}")
		}
	}
	mode := "normal"
	if strings.Contains(req.Header.Get("Accept-Encoding"), "gzip") == true {
		mode = "gzip"
	}
	hash := QuickHash(mode+string(dataToSend), 20)
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
	if shouldIndentResponse(res) {
		encoder.SetIndent("", IndentSize)
	}
	encoder.Encode(APISuccessResults{"ok", data})
}

func SendSuccessResultsWithMetadata(res http.ResponseWriter, data interface{}, p interface{}) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	if shouldIndentResponse(res) {
		encoder.SetIndent("", IndentSize)
	}
	encoder.Encode(APISuccessResultsWithMetadata{"ok", data, p})
}

func SendErrorResult(res http.ResponseWriter, err error) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	if shouldIndentResponse(res) {
		encoder.SetIndent("", IndentSize)
	}
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

func SendRaw(res http.ResponseWriter, data interface{}) {
	encoder := json.NewEncoder(res)
	encoder.SetEscapeHTML(false)
	if shouldIndentResponse(res) {
		encoder.SetIndent("", IndentSize)
	}
	encoder.Encode(data)
}

func Page(stuff string) string {
	return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
    <title>` + Config.Get("general.name").String() + `</title>
    <style>
      html { background: #f2f3f5; font-size: 16px; font-family: "San Francisco","Roboto","Arial",sans-serif; }
      body { text-align: center; padding-top: 50px; text-align: center; margin: 0; }
      h1 { font-weight: 200; line-height: 1em; font-size: 40px; }
      p { opacity: 0.8; font-size: 1.05em; }
      form { max-width: 450px; margin: 0 auto; padding: 0 10px; text-align: left; }
      button { padding: 11px 0px; width: 100%; background: #466372; color: white; margin-top: 10px; cursor: pointer; font-weight: bold; border: none; border-radius: 2px; box-shadow: 2px 2px 2px rgb(0 0 0 / 15%); }
      input, textarea { display: block; margin: 8px 0; border: none; outline: none; padding: 13px 15px; box-shadow: 2px 2px 2px rgb(0 0 0 / 5%); min-width: 100%; max-width: 100%; max-height: 80px; box-sizing: border-box; border-radius: 2px; }
      input, textarea, body { color: #313538; }
      input, textarea, button { font-size: inherit; }
    </style>
  </head>
  <body class="common_response_page">
    ` + stuff + `
    <style>
      ` + Hooks.Get.CSS() + `
      ` + Config.Get("general.custom_css").String() + `
    </style>
  </body>
</html>`
}

func RedirectPage(url string) string {
	return `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Refresh" content="0; url=` + url + `" />
  </head>
<body>
  <script>
    location.href = "` + url + `"
  </script>
</body>
</html>
`
}

func shouldIndentResponse(res http.ResponseWriter) bool {
	reqID := res.Header().Get("X-Request-Id")
	if reqID == "" {
		return false
	} else if strings.HasPrefix(reqID, "API") == false {
		return false
	}
	return true
}
