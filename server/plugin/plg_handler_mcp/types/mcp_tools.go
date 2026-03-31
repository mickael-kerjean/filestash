package types

import (
	"encoding/json"
)

type Meta map[string]any

type Run func(params map[string]any, userSession *UserSession) (*ToolResponse, error)

type Tool struct {
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	InputSchema  json.RawMessage `json:"inputSchema"`
	OutputSchema json.RawMessage `json:"outputSchema,omitempty"`
	Meta         Meta            `json:"_meta,omitempty"`
	Run          Run             `json:"-"`
	Annotations  Meta            `json:"annotations,omitempty"`
}

type ListToolsResponse struct {
	Tools []Tool `json:"tools"`
}

type ToolResponse struct {
	Content           []TextContent  `json:"content"`
	StructuredContent map[string]any `json:"structuredContent,omitempty"`
	IsError           bool           `json:"isError"`
}
