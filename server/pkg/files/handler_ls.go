package files

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"hash/crc32"
	"net/http"
	"os"
	"strconv"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

func FileLs(ctx *App, res http.ResponseWriter, req *http.Request) {
	if permissions.CanRead(ctx) == false {
		if permissions.CanUpload(ctx) == false {
			Log.Debug("ls::permission 'permission denied'")
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		SendSuccessResults(res, make([]FileInfo, 0))
		return
	}
	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("ls::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	perms := Metadata{}
	if obj, ok := ctx.Backend.(interface{ Meta(path string) Metadata }); ok {
		perms = obj.Meta(path)
	}
	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Ls(ctx, path); err != nil {
			Log.Info("ls::auth '%s'", err.Error())
			SendErrorResult(res, err)
			return
		}
		ctx.Context = context.WithValue(ctx.Context, "AUDIT", false)
		if err = auth.Mkdir(ctx, path); err != nil {
			perms.CanCreateDirectory = NewBool(false)
		}
		if err = auth.Touch(ctx, path); err != nil {
			perms.CanCreateFile = NewBool(false)
		}
		if err = auth.Mv(ctx, path, path); err != nil {
			perms.CanRename = NewBool(false)
			perms.CanMove = NewBool(false)
		}
		if err = auth.Save(ctx, path); err != nil {
			perms.CanUpload = NewBool(false)
		}
		if err = auth.Rm(ctx, path); err != nil {
			perms.CanDelete = NewBool(false)
		}
		if err = auth.Cat(ctx, path); err != nil {
			perms.CanSee = NewBool(false)
		}
		ctx.Context = context.WithValue(ctx.Context, "AUDIT", nil)
	}
	if permissions.CanEdit(ctx) == false {
		perms.CanCreateFile = NewBool(false)
		perms.CanCreateDirectory = NewBool(false)
		perms.CanRename = NewBool(false)
		perms.CanMove = NewBool(false)
		perms.CanDelete = NewBool(false)
		perms.CanUpload = NewBool(false)
	}
	if permissions.CanUpload(ctx) == false {
		perms.CanCreateDirectory = NewBool(false)
		perms.CanRename = NewBool(false)
		perms.CanMove = NewBool(false)
		perms.CanDelete = NewBool(false)
		perms.CanUpload = NewBool(false)
	}
	if permissions.CanShare(ctx) == false {
		perms.CanShare = NewBool(false)
	}

	entries, err := ctx.Backend.Ls(path)
	if err != nil {
		Log.Debug("ls::backend '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	files := make([]FileInfo, len(entries))
	etagger := crc32.NewIEEE()
	json.NewEncoder(etagger).Encode(perms)
	etagger.Write([]byte(path + strconv.Itoa(len(entries))))
	for i := 0; i < len(entries); i++ {
		name := entries[i].Name()
		files[i] = FileInfo{
			Name: name,
			Size: entries[i].Size(),
			Time: func(mt time.Time) (modTime int64) {
				if mt.IsZero() == false {
					modTime = mt.UnixNano() / int64(time.Millisecond)
				}
				etagger.Write([]byte(name + strconv.Itoa(int(modTime))))
				return modTime
			}(entries[i].ModTime()),
			Type: func(mode os.FileMode) string {
				if mode.IsRegular() {
					return "file"
				}
				return "directory"
			}(entries[i].Mode()),
			Mode: func(mode os.FileMode) uint32 {
				return uint32(mode)
			}(entries[i].Mode()),
		}
		if f, ok := entries[i].Sys().(File); ok && f.Offline == true {
			files[i].Offline = true
		}
	}

	etagValue := base64.StdEncoding.EncodeToString(etagger.Sum(nil))
	res.Header().Set("Etag", etagValue)
	if etagValue != "" && req.Header.Get("If-None-Match") == etagValue {
		res.WriteHeader(http.StatusNotModified)
		return
	}
	SendSuccessResultsWithMetadata(res, files, perms)
}
