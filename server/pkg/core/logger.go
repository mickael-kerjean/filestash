package core

type ILogger interface {
	Debug(format string, v ...interface{})
	Info(format string, v ...interface{})
	Warning(format string, v ...interface{})
	Error(format string, v ...interface{})
	Stdout(format string, v ...interface{})
	SetVisibility(str string)
}
