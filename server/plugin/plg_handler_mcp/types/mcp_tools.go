package types

import (
	"encoding/json"
)

type Meta map[string]any

type Run func(params map[string]any, userSession *UserSession) (*TextContent, error)

type Tool struct {
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	InputSchema  json.RawMessage `json:"inputSchema"`
	OutputSchema json.RawMessage `json:"outputSchema,omitempty"`
	Meta         Meta            `json:"-"`
	Run          Run             `json:"-"`
}

type ListToolsResponse struct {
	Tools []Tool `json:"tools"`
}

type ToolResponse struct {
	Content           []TextContent  `json:"content"`
	StructuredContent map[string]any `json:"structuredContent,omitempty"`
	Meta              Meta           `json:"_meta,omitempty"`
	IsError           bool           `json:"isError"`
}
