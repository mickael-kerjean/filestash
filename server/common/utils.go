package common

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"strconv"
	"strings"
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
	case bool:
		return fmt.Sprintf("%t", val.(bool))
	case []interface{}:
		list := val.([]interface{})
		strSlice := make([]string, len(list))
		for i, el := range list {
			strSlice[i] = NewStringFromInterface(el)
		}
		return strings.Join(strSlice, ",")
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
