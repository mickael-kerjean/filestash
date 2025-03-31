package types

type CallPromptsList struct {
	Prompts    []Prompt `json:"prompts"`
	NextCursor string   `json:"nextCursor",omitempty`
}

type Prompt struct {
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Arguments   []PromptArgument `json:"arguments"`
}

type PromptArgument struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Required    bool   `json:"required"`
}

type CallPromptGet struct {
	Description string          `json:"description"`
	Messages    []PromptMessage `json:"messages"`
}

type PromptMessage struct {
	Role    string      `json:"role"`
	Content TextContent `json:"content"`
}
