package types

type InitializeResponse struct {
	ProtocolVersion string       `json:"protocolVersion"`
	ServerInfo      ServerInfo   `json:"serverInfo"`
	Capabilities    Capabilities `json:"capabilities"`
}

type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

type Capabilities struct {
	Tools     map[string]interface{} `json:"tools",omitempty`
	Resources map[string]interface{} `json:"resources",omitempty`
	Prompts   map[string]interface{} `json:"prompts",omitempty`
}
