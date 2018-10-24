package common

type Plugin struct {
	Type     string
	Call     interface{}
	Priority int
}

const (
	PROCESS_FILE_CONTENT_BEFORE_SEND = "PROCESS_FILE_CONTENT_BEFORE_SEND"
)
