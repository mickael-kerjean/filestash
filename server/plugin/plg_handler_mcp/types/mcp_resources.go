package types

type CallResourcesList struct {
	Resources []Resource `json:"resources"`
}

type CallResourceTemplatesList struct {
	ResourceTemplates []ResourceTemplate `json:"resourceTemplates"`
}

type CallResourceRead struct {
	Contents []ResourceContent `json:"contents"`
}

type Resource struct {
	URI         string `json:"uri"`
	Name        string `json:"name"`
	Description string `json:"description"`
	MimeType    string `json:"mimeType"`
}

type ResourceTemplate struct {
	URITemplate string `json:"uriTemplate"`
	Name        string `json:"name"`
	Description string `json:"description"`
	MimeType    string `json:"mimeType"`
}

type ResourceContent struct {
	URI      string `json:"uri"`
	MimeType string `json:"mimeType"`
	Text     string `json:"text"`
}
