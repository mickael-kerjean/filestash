package common

import (
	"math/rand"
)

var Letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

func RandomString(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = Letters[rand.Intn(len(Letters))]
	}
	return string(b)
}

func NewBool(t bool) *bool {
	return &t
}

func NewString(t string) *string {
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
func NewIntpFromInterface(val interface{}) *int {
	switch val.(type) {
	case int:
		v := val.(int)
		return &v
	case float64:
		v := int(val.(float64))
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
