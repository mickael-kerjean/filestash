package utils

import (
	"encoding/json"
)

func JsonSchema(in any) json.RawMessage {
	b, _ := json.Marshal(in)
	return json.RawMessage(b)
}

func JsonText(in any) string {
	b, _ := json.MarshalIndent(in, "", "    ")
	return string(b)
}
