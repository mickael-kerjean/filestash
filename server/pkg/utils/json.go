package utils

import (
	"bytes"
	"encoding/json"
)

func PrettyPrint(json_dirty []byte) []byte {
	var json_pretty bytes.Buffer
	error := json.Indent(&json_pretty, json_dirty, "", "    ")
	if error != nil {
		return json_dirty
	}
	json_pretty.Write([]byte("\n"))
	return json_pretty.Bytes()
}
