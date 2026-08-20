package share

type Proof struct {
	Id      string  `json:"id"`
	Key     string  `json:"key"`
	Value   string  `json:"-"`
	Message *string `json:"message,omitempty"`
	Error   *string `json:"error,omitempty"`
}
