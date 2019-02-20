package ctrl

import (
	"hash/fnv"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"strconv"
	"time"
)

type FileInfo struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Size int64  `json:"size"`
	Time int64  `json:"time"`
}

func FileLs(ctx App, res http.ResponseWriter, req *http.Request) {
	if model.CanRead(&ctx) == false {
		if model.CanUpload(&ctx) == false {
			SendErrorResult(res, NewError("Permission denied", 403))
			return
		}
		SendSuccessResults(res, make([]FileInfo, 0))
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

	files := make([]FileInfo, len(entries))
	etagger := fnv.New32()
	etagger.Write([]byte(path + strconv.Itoa(len(entries))))
	for i:=0; i<len(entries); i++ {
		name := entries[i].Name()
		modTime := entries[i].ModTime().UnixNano() / int64(time.Millisecond)

		if i < 200 { // etag is generated from a few values to avoid large memory usage
			etagger.Write([]byte(name + strconv.Itoa(int(modTime))))
		}

		files[i] = FileInfo{
			Name: name,
			Size: entries[i].Size(),
			Time: modTime,
			Type: func(isDir bool) string {
				if isDir == true {
					return "directory"
				}
				return "file"
			}(entries[i].IsDir()),
		}
	}

	var perms Metadata = Metadata{}
	if obj, ok := ctx.Backend.(interface{ Meta(path string) Metadata }); ok {
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

	etagValue := string(etagger.Sum(nil))//QuickHash(etag.String(), 20)
	res.Header().Set("Etag", etagValue)
	if etagValue != "" && req.Header.Get("If-None-Match") == etagValue {
		res.WriteHeader(http.StatusNotModified)
		return
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
		SendErrorResult(res, ErrPermissionDenied)
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
	header := res.Header()
	header.Set("Content-Type", mType)
	header.Set("Content-Security-Policy", "script-src 'none'")

	for _, obj := range Hooks.Get.ProcessFileContentBeforeSend() {
		if file, err = obj(file, &ctx, &res, req); err != nil {
			SendErrorResult(res, err)
			return
		}
	}
	io.Copy(res, file)
}

func FileAccess(ctx App, res http.ResponseWriter, req *http.Request) {
	allowed := []string{}
	if model.CanRead(&ctx){
		allowed = append(allowed, "GET")
	}
	if model.CanEdit(&ctx){
		allowed = append(allowed, "PUT")
	}
	if model.CanUpload(&ctx){
		allowed = append(allowed, "POST")
	}
	res.Header().Set("Allow", strings.Join(allowed, ", "))
	SendSuccessResult(res, nil)
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
	sessionPath := ctx.Session["path"]
	basePath := filepath.Join(sessionPath, path)
	if path[len(path)-1:] == "/" && basePath != "/" {
		basePath += "/"
	}
	if strings.HasPrefix(basePath, ctx.Session["path"]) == false {
		return "", NewError("There's nothing here", 403)
	}
	return basePath, nil
}
