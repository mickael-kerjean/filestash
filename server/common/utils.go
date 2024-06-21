package common

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"strconv"
)

func NewBool(t bool) *bool {
	return &t
}

func NewString(t string) *string {
	if t == "" {
		return nil
	}
	return &t
}

func NewInt(t int) *int {
	return &t
}

func NewBoolFromInterface(val interface{}) bool {
	switch val.(type) {
	case bool:
		return val.(bool)
	default:
		return false
	}
}

func NewInt64pFromInterface(val interface{}) *int64 {
	switch val.(type) {
	case int64:
		v := val.(int64)
		return &v
	case float64:
		v := int64(val.(float64))
		return &v
	default:
		return nil
	}
}

func NewStringpFromInterface(val interface{}) *string {
	switch val.(type) {
	case string:
		v := val.(string)
		return &v
	default:
		return nil
	}
}

func NewStringFromInterface(val interface{}) string {
	switch val.(type) {
	case string:
		return val.(string)
	case float64:
		return fmt.Sprintf("%d", int64(val.(float64)))
	default:
		return ""
	}
}

func NewReadCloserFromBytes(t []byte) io.ReadCloser {
	return ioutil.NopCloser(bytes.NewReader(t))
}

func NewReadCloserFromReader(r io.Reader) io.ReadCloser {
	return ioutil.NopCloser(r)
}

func PrettyPrint(json_dirty []byte) []byte {
	var json_pretty bytes.Buffer
	error := json.Indent(&json_pretty, json_dirty, "", "    ")
	if error != nil {
		return json_dirty
	}
	json_pretty.Write([]byte("\n"))
	return json_pretty.Bytes()
}

func CookieName(idx int) string {
	if idx == 0 {
		return COOKIE_NAME_AUTH
	}
	return COOKIE_NAME_AUTH + strconv.Itoa(idx)
}

func FormData(req *http.Request) (map[string]string, error) {
	_get := req.URL.Query()
	formData := map[string]string{}
	switch req.Method {
	case "GET":
		for key, element := range _get {
			if len(element) == 0 {
				continue
			}
			formData[key] = element[0]
		}
	case "POST":
		if err := req.ParseForm(); err != nil {
			return nil, NewError(err.Error(), 400)
		}
		for key, values := range req.Form {
			if len(values) == 0 {
				continue
			}
			formData[key] = values[0]
		}
	}
	return formData, nil
}
