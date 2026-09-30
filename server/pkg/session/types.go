package session

type Session struct {
	Home          *string `json:"home,omitempty"`
	IsAuth        bool    `json:"is_authenticated"`
	Backend       string  `json:"backendID"`
	Authorization string  `json:"authorization,omitempty"`
}
