package ctrl

import (
	. "github.com/mickael-kerjean/nuage/server/common"
	"github.com/mickael-kerjean/nuage/server/model"
	"github.com/mickael-kerjean/nuage/server/plugin"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"
)

type FileInfo struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Size int64  `json:"size"`
	Time int64  `json:"time"`
}

func FileLs(ctx App, res http.ResponseWriter, req *http.Request) {
	var files []FileInfo
	if model.CanRead(&ctx) == false {
		if model.CanUpload(&ctx) == false {
			SendErrorResult(res, NewError("Permission denied", 403))
			return
		}
		SendSuccessResults(res, files)
		return
	}

	path, err := pathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	entries, err := ctx.Backend.Ls(path)
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	for _, entry := range entries {
		f := FileInfo{
			Name: entry.Name(),
			Size: entry.Size(),
			Time: func(t time.Time) int64 {
				return t.UnixNano() / int64(time.Millisecond)
			}(entry.ModTime()),
			Type: func(isDir bool) string {
				if isDir == true {
					return "directory"
				}
				return "file"
			}(entry.IsDir()),
		}
		files = append(files, f)
	}

	var perms *Metadata = &Metadata{}
	if obj, ok := ctx.Backend.(interface{ Meta(path string) *Metadata }); ok {
		perms = obj.Meta(path)
	}

	if model.CanEdit(&ctx) == false {
		perms.CanCreateFile = NewBool(false)
		perms.CanCreateDirectory = NewBool(false)
		perms.CanRename = NewBool(false)
		perms.CanMove = NewBool(false)
		perms.CanDelete = NewBool(false)
	}
	if model.CanUpload(&ctx) == false {
		perms.CanCreateDirectory = NewBool(false)
		perms.CanRename = NewBool(false)
		perms.CanMove = NewBool(false)
		perms.CanDelete = NewBool(false)
	}
	if model.CanShare(&ctx) == false {
		perms.CanShare = NewBool(false)
	}

	SendSuccessResultsWithMetadata(res, files, perms)
}

func FileCat(ctx App, res http.ResponseWriter, req *http.Request) {
	http.SetCookie(res, &http.Cookie{
		Name:   "download",
		Value:  "",
		MaxAge: -1,
		Path:   "/",
	})
	if model.CanRead(&ctx) == false {
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := pathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	file, err := ctx.Backend.Cat(path)
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	if obj, ok := file.(interface{ Close() error }); ok {
		defer obj.Close()
	}

	mType := GetMimeType(req.URL.Query().Get("path"))
	res.Header().Set("Content-Type", mType)

	for _, obj := range plugin.ProcessFileContentBeforeSend() {
		if obj == nil {
			continue
		}
		if file, err = obj(file, &ctx, &res, req); err != nil {
			SendErrorResult(res, err)
			return
		}
	}
	io.Copy(res, file)
}

func FileSave(ctx App, res http.ResponseWriter, req *http.Request) {
	if model.CanEdit(&ctx) == false {
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := pathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	file, _, err := req.FormFile("file")
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	defer file.Close()

	err = ctx.Backend.Save(path, file)
	if obj, ok := file.(interface{ Close() error }); ok {
		obj.Close()
	}
	if err != nil {
		SendErrorResult(res, NewError(err.Error(), 403))
		return
	}
	SendSuccessResult(res, nil)
}

func FileMv(ctx App, res http.ResponseWriter, req *http.Request) {
	if model.CanEdit(&ctx) == false {
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	from, err := pathBuilder(ctx, req.URL.Query().Get("from"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	to, err := pathBuilder(ctx, req.URL.Query().Get("to"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	if from == "" || to == "" {
		SendErrorResult(res, NewError("missing path parameter", 400))
		return
	}

	err = ctx.Backend.Mv(from, to)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func FileRm(ctx App, res http.ResponseWriter, req *http.Request) {
	if model.CanEdit(&ctx) == false {
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := pathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	err = ctx.Backend.Rm(path)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func FileMkdir(ctx App, res http.ResponseWriter, req *http.Request) {
	if model.CanUpload(&ctx) == false {
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := pathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	err = ctx.Backend.Mkdir(path)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func FileTouch(ctx App, res http.ResponseWriter, req *http.Request) {
	if model.CanUpload(&ctx) == false {
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := pathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		SendErrorResult(res, err)
		return
	}

	err = ctx.Backend.Touch(path)
	if err != nil {
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func pathBuilder(ctx App, path string) (string, error) {
	if path == "" {
		return "", NewError("No path available", 400)
	}
	basePath := ctx.Session["path"]
	basePath = filepath.Join(basePath, path)
	if string(path[len(path)-1]) == "/" && basePath != "/" {
		basePath += "/"
	}
	if strings.HasPrefix(basePath, ctx.Session["path"]) == false {
		return "", NewError("There's nothing here", 403)
	}
	return basePath, nil
}
