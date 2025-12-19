package types

type ResourcesListResponse struct {
	Resources []Resource `json:"resources"`
}

type ResourceTemplatesListResponse struct {
	ResourceTemplates []ResourceTemplate `json:"resourceTemplates"`
}

type ResourceReadResponse struct {
	Contents []ResourceContent `json:"contents"`
}

type Resource struct {
	URI         string `json:"uri"`
	Name        string `json:"name"`
	Description string `json:"description"`
	MimeType    string `json:"mimeType"`
	Content     string `json:"-"`
	Meta        Meta   `json:"-"`
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
	Meta     Meta   `json:"_meta,omitempty"`
}
