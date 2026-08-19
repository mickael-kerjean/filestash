package core

import (
	"bytes"
	"encoding/json"
	"strings"
)

type Form struct {
	Title  string
	Form   []Form
	Elmnts []FormElement
}

type FormElement struct {
	Id          string      `json:"id,omitempty"`
	Name        string      `json:"label"`
	Type        string      `json:"type"`
	Description string      `json:"description,omitempty"`
	Placeholder string      `json:"placeholder,omitempty"`
	Pattern     string      `json:"pattern,omitempty"`
	Opts        []string    `json:"options,omitempty"`
	Target      []string    `json:"target,omitempty"`
	ReadOnly    bool        `json:"readonly"`
	Default     interface{} `json:"default"`
	Value       interface{} `json:"value"`
	MultiValue  bool        `json:"multi,omitempty"`
	Datalist    []string    `json:"datalist,omitempty"`
	Order       int         `json:"-"`
	Required    bool        `json:"required"`
}

func (this Form) MarshalJSON() ([]byte, error) {
	return FormToJSON(this, func(el FormElement) any { return el })
}

func FormToJSON(f Form, fn func(FormElement) any) ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteByte('{')
	first := true
	for _, el := range f.Elmnts {
		v := fn(el)
		if v == nil {
			continue
		}
		if !first {
			buf.WriteByte(',')
		}
		first = false
		key, _ := json.Marshal(strings.ReplaceAll(el.Name, " ", "_"))
		val, _ := json.Marshal(v)
		buf.Write(key)
		buf.WriteByte(':')
		buf.Write(val)
	}
	for _, sub := range f.Form {
		subBytes, _ := FormToJSON(sub, fn)
		if bytes.Equal(subBytes, []byte("{}")) {
			continue
		}
		if !first {
			buf.WriteByte(',')
		}
		first = false
		key, _ := json.Marshal(strings.ReplaceAll(sub.Title, " ", "_"))
		buf.Write(key)
		buf.WriteByte(':')
		buf.Write(subBytes)
	}
	buf.WriteByte('}')
	return buf.Bytes(), nil
}
