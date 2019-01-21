package common

import (
	"bytes"
	"encoding/json"
	"sync"
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
	case bool: return val.(bool)
	default: return false
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
	default: return nil
	}
}

func NewStringpFromInterface(val interface{}) *string {
	switch val.(type) {
	case string:
		v := val.(string)
		return &v
	default: return nil
	}
}

func NewStringFromInterface(val interface{}) string {
	switch val.(type) {
	case string:
		v := val.(string)
		return v
	default: return ""
	}
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

type SafeMapStringString struct {
	sync.RWMutex
	internal map[string]string
}

func NewSafeMapStringString() SafeMapStringString {
	return SafeMapStringString{
		internal: make(map[string]string),
	}
}

func(this SafeMapStringString) Set(key string, value string) {
	this.Lock()
	this.internal[key] = value
	this.Unlock()
}

func(this SafeMapStringString) Gets(keys ...string) []string{
	this.RLock()
	res := make([]string, len(keys))
    for i, key := range keys {
		res[i] = this.internal[key]
    }
	this.RUnlock()
	return res
}
