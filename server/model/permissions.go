package model

import (
	. "github.com/mickael-kerjean/nuage/server/common"
)


func CanRead(ctx *App) bool {
	keyword := ctx.Session["can_read"]
	if keyword == "" || keyword == "yes" {
		return true
	}
	return false
}

func CanEdit(ctx *App) bool {
	keyword := ctx.Session["can_write"]
	if keyword == "" || keyword == "yes" {
		return true
	}
	return false
}

func CanUpload(ctx *App) bool {
	keyword := ctx.Session["can_upload"]
	if keyword == "" || keyword == "yes" {
		return true
	}
	return false
}

func CanShare(ctx *App) bool {
	keyword := ctx.Session["can_share"]
	if keyword == "" || keyword == "yes" {
		return true
	}
	return false
}
