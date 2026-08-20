package core

type IAuthorisation interface {
	Ls(ctx *App, path string) error
	Cat(ctx *App, path string) error
	Stat(ctx *App, path string) error
	Mkdir(ctx *App, path string) error
	Rm(ctx *App, path string) error
	Mv(ctx *App, from string, to string) error
	Save(ctx *App, path string) error
	Touch(ctx *App, path string) error
}
