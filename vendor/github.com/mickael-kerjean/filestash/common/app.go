package common

type App struct {
	Backend IBackend
	Body    map[string]interface{}
	Session map[string]string
	Share   Share
}
