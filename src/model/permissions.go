package model

import (
	. "github.com/mickael-kerjean/filestash/src/common"
)

func CanRead(ctx *App) bool {
	if ctx.Share.Id != "" {
		return ctx.Share.CanRead 
	}
	return true
}

func CanEdit(ctx *App) bool {
	if ctx.Share.Id != "" {
		return ctx.Share.CanWrite
	}
	return true
}

func CanUpload(ctx *App) bool {
	if ctx.Share.Id != "" {
		return ctx.Share.CanUpload
	}
	return true
}

func CanShare(ctx *App) bool {
	if ctx.Share.Id != "" {
		return ctx.Share.CanShare
	}
	return true
}
