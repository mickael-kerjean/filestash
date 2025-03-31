package types

import "encoding/json"

type IResource interface {
	Resource() ([]json.RawMessage, error)
}

type TextContent struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type BinaryContent struct {
	URI      string `json:uri"`
	MimeType string `json:"mimeType"`
	Blob     []byte `json:"blob"`
}

func (this TextContent) Resource() ([]byte, error) {
	return json.Marshal(this)
}

func (this BinaryContent) Resource() ([]byte, error) {
	return json.Marshal(this)
}
