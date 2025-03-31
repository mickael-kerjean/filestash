package types

import (
	"encoding/json"
)

type CallListTools struct {
	Tools []Tool `json:"tools"`
}

type Tool struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	InputSchema json.RawMessage `json:"inputSchema"`
}

type CallTool struct {
	Content []TextContent `json:"content"`
}
