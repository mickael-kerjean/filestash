package plg_widget_chat

type Message struct {
	Path      string `json:"path"`
	Author    string `json:"author"`
	Message   string `json:"message"`
	CreatedAt int64  `json:"created_at"`
}
