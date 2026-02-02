package plg_widget_chat

type Message struct {
	ID        string `json:"id"`
	Path      string `json:"path"`
	Author    string `json:"author"`
	Message   string `json:"message"`
	CreatedAt int64  `json:"created_at"`
}
