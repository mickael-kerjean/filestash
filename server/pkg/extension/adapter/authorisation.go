package adapter

import (
	"context"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	"github.com/mickael-kerjean/filestash/server/pkg/extension/adapter/runtime"
	"github.com/mickael-kerjean/filestash/server/pkg/utils"
)

type authKey struct{}
type authData struct {
	path   string
	target string
	allow  bool
}

func stateAuthorisation(ctx context.Context) *authData {
	d, _ := ctx.Value(authKey{}).(*authData)
	return d
}

func exportAuthorisation(b *runtime.HostModuleBuilder) {
	b.Export("ffi_authorisation_pull_path", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
		return mem.WriteString(outPtr, outCap, stateAuthorisation(ctx).path)
	}).Export("ffi_authorisation_pull_target", func(ctx context.Context, mem runtime.IMemory, outPtr, outCap uint32) uint32 {
		return mem.WriteString(outPtr, outCap, stateAuthorisation(ctx).target)
	}).Export("ffi_authorisation_push_allow", func(ctx context.Context) {
		stateAuthorisation(ctx).allow = true
	})
}

func (in *Instance) Authorisation() IAuthorisation {
	return &authorisation{rt: in.rt}
}

type authorisation struct {
	rt *runtime.Runtime
}

func (a *authorisation) Ls(ctx *App, path string) error {
	return a.check(ctx, "authorisation_ls", &authData{path: path})
}
func (a *authorisation) Cat(ctx *App, path string) error {
	return a.check(ctx, "authorisation_cat", &authData{path: path})
}
func (a *authorisation) Stat(ctx *App, path string) error {
	return a.check(ctx, "authorisation_stat", &authData{path: path})
}
func (a *authorisation) Mkdir(ctx *App, path string) error {
	return a.check(ctx, "authorisation_mkdir", &authData{path: path})
}
func (a *authorisation) Rm(ctx *App, path string) error {
	return a.check(ctx, "authorisation_rm", &authData{path: path})
}
func (a *authorisation) Save(ctx *App, path string) error {
	return a.check(ctx, "authorisation_save", &authData{path: path})
}
func (a *authorisation) Touch(ctx *App, path string) error {
	return a.check(ctx, "authorisation_touch", &authData{path: path})
}
func (a *authorisation) Mv(ctx *App, from string, to string) error {
	return a.check(ctx, "authorisation_mv", &authData{path: from, target: to})
}
func (a *authorisation) check(ctx *App, fn string, ad *authData) error {
	if ctx.Context.Value("AUDIT") == false {
		return nil
	}
	if err := a.rt.Call(ctx.Context, fn, authKey{}, ad); err != nil {
		return err
	}
	if !ad.allow {
		return utils.ErrPermissionDenied
	}
	return nil
}
