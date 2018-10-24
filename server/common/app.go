package common

type App struct {
	Config  *Config
	Backend IBackend
	Body    map[string]interface{}
	Session map[string]string
}
