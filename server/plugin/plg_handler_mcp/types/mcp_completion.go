package types

type CallCompletionResult struct {
	Completion Completion `json:"completion"`
}

type Completion struct {
	Values  []string `json:"values"`
	Total   uint64   `json:"total"`
	HasMore bool     `json:"hasMore"`
}
