package plg_authorisation_example

import (
	. "github.com/mickael-kerjean/filestash/server/common"
)

func init() {
	Hooks.Register.AuthorisationMiddleware(AuthM{})
}

type AuthM struct{}

func (this AuthM) Ls(ctx App, path string) error {
	Log.Stdout("LS %+v", ctx.Session)
	return nil
}

func (this AuthM) Cat(ctx App, path string) error {
	Log.Stdout("CAT %+v", ctx.Session)
	return nil
}

func (this AuthM) Mkdir(ctx App, path string) error {
	Log.Stdout("MKDIR %+v", ctx.Session)
	return ErrNotAllowed
}

func (this AuthM) Rm(ctx App, path string) error {
	Log.Stdout("RM %+v", ctx.Session)
	return ErrNotAllowed
}

func (this AuthM) Mv(ctx App, from string, to string) error {
	Log.Stdout("MV %+v", ctx.Session)
	return ErrNotAllowed
}

func (this AuthM) Save(ctx App, path string) error {
	Log.Stdout("SAVE %+v", ctx.Session)
	return ErrNotAllowed
}

func (this AuthM) Touch(ctx App, path string) error {
	Log.Stdout("TOUCH %+v", ctx.Session)
	return ErrNotAllowed
}
