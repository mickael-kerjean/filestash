package ctrl

import (
	"archive/zip"
	"encoding/base64"
	"fmt"
	"hash/fnv"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
)

type FileInfo struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Size int64  `json:"size"`
	Time int64  `json:"time"`
}

var (
	FileCache  AppCache
	ZipTimeout func() int
)

func init() {
	FileCache = NewAppCache()
	cachePath := filepath.Join(GetCurrentDir(), TMP_PATH)
	FileCache.OnEvict(func(key string, value interface{}) {
		os.RemoveAll(filepath.Join(cachePath, key))
	})
	ZipTimeout = func() int {
		return Config.Get("features.protection.zip_timeout").Schema(func(f *FormElement) *FormElement {
			if f == nil {
				f = &FormElement{}
			}
			f.Default = 60
			f.Name = "zip_timeout"
			f.Type = "number"
			f.Description = "Timeout when user wants to download archive as a zip"
			f.Placeholder = "Default: 60seconds"
			return f
		}).Int()
	}
	ZipTimeout()
}

func FileLs(ctx *App, res http.ResponseWriter, req *http.Request) {
	if model.CanRead(ctx) == false {
		if model.CanUpload(ctx) == false {
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
	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Ls(ctx, path); err != nil {
			Log.Info("ls::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	entries, err := ctx.Backend.Ls(path)
	if err != nil {
		Log.Debug("ls::backend '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	files := make([]FileInfo, len(entries))
	etagger := fnv.New32()
	etagger.Write([]byte(path + strconv.Itoa(len(entries))))
	for i := 0; i < len(entries); i++ {
		name := entries[i].Name()
		modTime := entries[i].ModTime().UnixNano() / int64(time.Millisecond)

		if i < 200 { // etag is generated from a few values to avoid large memory usage
			etagger.Write([]byte(name + strconv.Itoa(int(modTime))))
		}

		files[i] = FileInfo{
			Name: name,
			Size: entries[i].Size(),
			Time: modTime,
			Type: func(mode os.FileMode) string {
				if mode.IsRegular() {
					return "file"
				}
				return "directory"
			}(entries[i].Mode()),
		}
	}

	var perms Metadata = Metadata{}
	if obj, ok := ctx.Backend.(interface{ Meta(path string) Metadata }); ok {
		perms = obj.Meta(path)
	}

	if model.CanEdit(ctx) == false {
		perms.CanCreateFile = NewBool(false)
		perms.CanCreateDirectory = NewBool(false)
		perms.CanRename = NewBool(false)
		perms.CanMove = NewBool(false)
		perms.CanDelete = NewBool(false)
	}
	if model.CanUpload(ctx) == false {
		perms.CanCreateDirectory = NewBool(false)
		perms.CanRename = NewBool(false)
		perms.CanMove = NewBool(false)
		perms.CanDelete = NewBool(false)
	}
	if model.CanShare(ctx) == false {
		perms.CanShare = NewBool(false)
	}

	etagValue := base64.StdEncoding.EncodeToString(etagger.Sum(nil))
	res.Header().Set("Etag", etagValue)
	if etagValue != "" && req.Header.Get("If-None-Match") == etagValue {
		res.WriteHeader(http.StatusNotModified)
		return
	}
	SendSuccessResultsWithMetadata(res, files, perms)
}

func FileCat(ctx *App, res http.ResponseWriter, req *http.Request) {
	header := res.Header()
	http.SetCookie(res, &http.Cookie{
		Name:   "download",
		Value:  "",
		MaxAge: -1,
		Path:   Config.Get("general.sub_folder").String() + "/",
	})
	if model.CanRead(ctx) == false {
		Log.Debug("cat::permission 'permission denied'")
		SendErrorResult(res, ErrPermissionDenied)
		return
	}
	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("cat::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Cat(ctx, path); err != nil {
			Log.Info("cat::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	var file io.ReadCloser
	var contentLength int64 = -1
	var needToCreateCache bool = false

	// use our cache if necessary (range request) when possible
	if req.Header.Get("range") != "" {
		ctx.Session["_path"] = path
		if p := FileCache.Get(ctx.Session); p != nil {
			f, err := os.OpenFile(p.(string), os.O_RDONLY, os.ModePerm)
			if err == nil {
				file = f
				if fi, err := f.Stat(); err == nil {
					contentLength = fi.Size()
				}
			}
		}
	}

	// perform the actual `cat` if needed
	if file == nil {
		if file, err = ctx.Backend.Cat(path); err != nil {
			Log.Debug("cat::backend '%s'", err.Error())
			SendErrorResult(res, err)
			return
		}
		header.Set("Content-Type", GetMimeType(req.URL.Query().Get("path")))
		if req.Header.Get("range") != "" {
			needToCreateCache = true
		}
	}

	// plugin hooks
	for _, obj := range Hooks.Get.ProcessFileContentBeforeSend() {
		if file, err = obj(file, ctx, &res, req); err != nil {
			Log.Debug("cat::hooks '%s'", err.Error())
			SendErrorResult(res, err)
			return
		}
	}

	// The extra complexity is to support: https://en.wikipedia.org/wiki/Progressive_download
	// => range request requires a seeker to work, some backend support it, some don't. 2 strategies:
	// 1. backend support Seek: use what the current backend gives us
	// 2. backend doesn't support Seek: build up a cache so that subsequent call don't trigger multiple downloads
	if req.Header.Get("range") != "" && needToCreateCache == true {
		if obj, ok := file.(io.Seeker); ok == true {
			if size, err := obj.Seek(0, io.SeekEnd); err == nil {
				if _, err = obj.Seek(0, io.SeekStart); err == nil {
					contentLength = size
				}
			}
		} else {
			tmpPath := filepath.Join(GetCurrentDir(), TMP_PATH, "file_"+QuickString(20)+".dat")
			f, err := os.OpenFile(tmpPath, os.O_RDWR|os.O_CREATE, os.ModePerm)
			if err != nil {
				Log.Debug("cat::range0 '%s'", err.Error())
				SendErrorResult(res, err)
				return
			}
			if _, err = io.Copy(f, file); err != nil {
				f.Close()
				file.Close()
				Log.Debug("cat::range1 '%s'", err.Error())
				SendErrorResult(res, err)
				return
			}
			f.Close()
			file.Close()
			if f, err = os.OpenFile(tmpPath, os.O_RDONLY, os.ModePerm); err != nil {
				Log.Debug("cat::range2 '%s'", err.Error())
				SendErrorResult(res, err)
				return
			}
			FileCache.Set(ctx.Session, tmpPath)
			if fi, err := f.Stat(); err == nil {
				contentLength = fi.Size()
			}
			file = f
		}
	}

	// Range request: find how much data we need to send
	var ranges [][]int64
	if req.Header.Get("range") != "" {
		ranges = make([][]int64, 0)
		for _, r := range strings.Split(strings.TrimPrefix(req.Header.Get("range"), "bytes="), ",") {
			r = strings.TrimSpace(r)
			if r == "" {
				continue
			}
			var start int64 = -1
			var end int64 = -1
			sides := strings.Split(r, "-")
			if len(sides) == 2 {
				if start, err = strconv.ParseInt(sides[0], 10, 64); err != nil || start < 0 {
					start = 0
				}
				if end, err = strconv.ParseInt(sides[1], 10, 64); err != nil || end < start {
					end = contentLength - 1
				}
			}

			if start != -1 && end != -1 && end-start >= 0 {
				ranges = append(ranges, []int64{start, end})
			}
		}
	}

	// publish headers
	if contentLength != -1 {
		header.Set("Content-Length", fmt.Sprintf("%d", contentLength))
	}
	if header.Get("Content-Security-Policy") == "" {
		header.Set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; font-src data:; script-src-elem 'self'")
	}
	header.Set("Accept-Ranges", "bytes")

	// Send data to the client
	if req.Method != "HEAD" {
		if f, ok := file.(io.ReadSeeker); ok && len(ranges) > 0 {
			if _, err = f.Seek(ranges[0][0], io.SeekStart); err == nil {
				header.Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", ranges[0][0], ranges[0][1], contentLength))
				header.Set("Content-Length", fmt.Sprintf("%d", ranges[0][1]-ranges[0][0]+1))
				res.WriteHeader(http.StatusPartialContent)
				io.CopyN(res, f, ranges[0][1]-ranges[0][0]+1)
			} else {
				res.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
			}
		} else {
			io.Copy(res, file)
		}
	}
	file.Close()
}

func FileAccess(ctx *App, res http.ResponseWriter, req *http.Request) {
	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("access::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	var perms Metadata = Metadata{}
	if obj, ok := ctx.Backend.(interface{ Meta(path string) Metadata }); ok {
		perms = obj.Meta(path)
	}

	allowed := []string{}
	if model.CanRead(ctx) {
		if perms.CanSee == nil || *perms.CanSee == true {
			allowed = append(allowed, "GET")
		}
	}
	if model.CanEdit(ctx) {
		if (perms.CanCreateFile == nil || *perms.CanCreateFile == true) &&
			(perms.CanCreateDirectory == nil || *perms.CanCreateDirectory == true) {
			allowed = append(allowed, "PUT")
		}
	}
	if model.CanUpload(ctx) {
		if perms.CanUpload == nil || *perms.CanUpload == true {
			allowed = append(allowed, "POST")
		}
	}
	header := res.Header()
	header.Set("Allow", strings.Join(allowed, ", "))
	SendSuccessResult(res, nil)
}

func FileSave(ctx *App, res http.ResponseWriter, req *http.Request) {
	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("save::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	if model.CanEdit(ctx) == false {
		if model.CanUpload(ctx) == false {
			Log.Debug("save::permission 'permission denied'")
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		// for user who cannot edit but can upload => we want to ensure there
		// won't be any overwritten data
		root, filename := SplitPath(path)
		entries, err := ctx.Backend.Ls(root)
		if err != nil {
			Log.Debug("ls::permission 'permission denied'")
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		for i := 0; i < len(entries); i++ {
			if entries[i].Name() == filename {
				Log.Debug("ls::permission 'conflict'")
				SendErrorResult(res, ErrConflict)
				return
			}
		}
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Save(ctx, path); err != nil {
			Log.Info("save::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	err = ctx.Backend.Save(path, req.Body)
	req.Body.Close()
	if err != nil {
		Log.Debug("save::backend '%s'", err.Error())
		SendErrorResult(res, NewError(err.Error(), 403))
		return
	}
	SendSuccessResult(res, nil)
}

func FileMv(ctx *App, res http.ResponseWriter, req *http.Request) {
	if model.CanEdit(ctx) == false {
		Log.Debug("mv::permission 'permission denied'")
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	from, err := PathBuilder(ctx, req.URL.Query().Get("from"))
	if err != nil {
		Log.Debug("mv::path::from '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	to, err := PathBuilder(ctx, req.URL.Query().Get("to"))
	if err != nil {
		Log.Debug("mv::path::to '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	if from == "" || to == "" {
		Log.Debug("mv::params 'missing path parameter'")
		SendErrorResult(res, NewError("missing path parameter", 400))
		return
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Mv(ctx, from, to); err != nil {
			Log.Info("mv::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	err = ctx.Backend.Mv(from, to)
	if err != nil {
		Log.Debug("mv::backend '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func FileRm(ctx *App, res http.ResponseWriter, req *http.Request) {
	if model.CanEdit(ctx) == false {
		Log.Debug("rm::permission 'permission denied'")
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("rm::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Rm(ctx, path); err != nil {
			Log.Info("rm::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	err = ctx.Backend.Rm(path)
	if err != nil {
		Log.Debug("rm::backend '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func FileMkdir(ctx *App, res http.ResponseWriter, req *http.Request) {
	if model.CanUpload(ctx) == false {
		Log.Debug("mkdir::permission 'permission denied'")
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("mkdir::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Mkdir(ctx, path); err != nil {
			Log.Info("mkdir::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	err = ctx.Backend.Mkdir(path)
	if err != nil {
		Log.Debug("mkdir::backend '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func FileTouch(ctx *App, res http.ResponseWriter, req *http.Request) {
	if model.CanUpload(ctx) == false {
		Log.Debug("touch::permission 'permission denied'")
		SendErrorResult(res, NewError("Permission denied", 403))
		return
	}

	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("touch::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Touch(ctx, path); err != nil {
			Log.Info("touch::auth '%s'", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	err = ctx.Backend.Touch(path)
	if err != nil {
		Log.Debug("touch::backend '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}
	SendSuccessResult(res, nil)
}

func FileDownloader(ctx *App, res http.ResponseWriter, req *http.Request) {
	var err error
	if model.CanRead(ctx) == false {
		Log.Debug("downloader::permission 'permission denied'")
		SendErrorResult(res, ErrPermissionDenied)
		return
	}
	paths := req.URL.Query()["path"]
	for i := 0; i < len(paths); i++ {
		if paths[i], err = PathBuilder(ctx, paths[i]); err != nil {
			Log.Debug("downloader::path '%s'", err.Error())
			SendErrorResult(res, err)
			return
		}
	}

	resHeader := res.Header()
	resHeader.Set("Content-Type", "application/zip")
	filename := "download"
	if len(paths) == 1 {
		filename = filepath.Base(paths[0])
	}
	resHeader.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s.zip\"", filename))

	start := time.Now()
	var addToZipRecursive func(*App, *zip.Writer, string, string, *[]string) error
	addToZipRecursive = func(c *App, zw *zip.Writer, backendPath string, zipRoot string, errList *[]string) (err error) {
		if time.Now().Sub(start) > time.Duration(ZipTimeout())*time.Second {
			Log.Debug("downloader::timeout zip not completed due to timeout")
			return ErrTimeout
		}
		if strings.HasSuffix(backendPath, "/") == false {
			// Process File
			zipPath := strings.TrimPrefix(backendPath, zipRoot)
			zipFile, err := zw.Create(zipPath)
			if err != nil {
				*errList = append(*errList, fmt.Sprintf("downloader::create %s %s\n", zipPath, err.Error()))
				Log.Debug("downloader::create backendPath['%s'] zipPath['%s'] error['%s']", backendPath, zipPath, err.Error())
				return err
			}
			file, err := ctx.Backend.Cat(backendPath)
			if err != nil {
				*errList = append(*errList, fmt.Sprintf("downloader::cat %s %s\n", zipPath, err.Error()))
				Log.Debug("downloader::cat backendPath['%s'] zipPath['%s'] error['%s']", backendPath, zipPath, err.Error())
				io.Copy(zipFile, strings.NewReader(""))
				return err
			}
			if _, err = io.Copy(zipFile, file); err != nil {
				*errList = append(*errList, fmt.Sprintf("downloader::copy %s %s\n", zipPath, err.Error()))
				Log.Debug("downloader::copy backendPath['%s'] zipPath['%s'] error['%s']", backendPath, zipPath, err.Error())
				io.Copy(zipFile, strings.NewReader(""))
				return err
			}
			file.Close()
			return nil
		}
		// Process Folder
		entries, err := c.Backend.Ls(backendPath)
		if err != nil {
			*errList = append(*errList, fmt.Sprintf("downloader::ls %s\n", err.Error()))
			Log.Debug("downloader::ls path['%s'] error['%s']", backendPath, err.Error())
			return err
		}
		for i := 0; i < len(entries); i++ {
			newBackendPath := backendPath + entries[i].Name()
			if entries[i].IsDir() {
				newBackendPath += "/"
			}
			if err = addToZipRecursive(ctx, zw, newBackendPath, zipRoot, errList); err != nil {
				*errList = append(*errList, fmt.Sprintf("downloader::recursive %s\n", err.Error()))
				Log.Debug("downloader::recursive path['%s'] error['%s']", newBackendPath, err.Error())
				return err
			}
		}
		return nil
	}

	zipWriter := zip.NewWriter(res)
	defer zipWriter.Close()
	errList := []string{}
	for i := 0; i < len(paths); i++ {
		zipRoot := ""
		if strings.HasSuffix(paths[i], "/") {
			zipRoot = strings.TrimSuffix(paths[i], filepath.Base(paths[i])+"/")
		} else {
			zipRoot = strings.TrimSuffix(paths[i], filepath.Base(paths[i]))
		}

		for _, auth := range Hooks.Get.AuthorisationMiddleware() {
			if err = auth.Ls(ctx, paths[i]); err != nil {
				Log.Info("downloader::ls::auth path['%s'] => '%s'", paths[i], err.Error())
				SendErrorResult(res, ErrNotAuthorized)
				return
			}
			if err = auth.Cat(ctx, paths[i]); err != nil {
				Log.Info("downloader::cat::auth path['%s'] => '%s'", paths[i], err.Error())
				SendErrorResult(res, ErrNotAuthorized)
				return
			}
		}
		addToZipRecursive(ctx, zipWriter, paths[i], zipRoot, &errList)
	}
	if len(errList) > 0 {
		if errorWriter, err := zipWriter.Create("error.log"); err == nil {
			for _, e := range errList {
				io.Copy(errorWriter, strings.NewReader(e))
			}
		}
	}
}

func PathBuilder(ctx *App, path string) (string, error) {
	if path == "" {
		return "", NewError("No path available", 400)
	}
	sessionPath := ctx.Session["path"]
	basePath := filepath.ToSlash(filepath.Join(sessionPath, path))
	if path[len(path)-1:] == "/" && basePath != "/" {
		basePath += "/"
	}
	if strings.HasPrefix(basePath, ctx.Session["path"]) == false {
		return "", NewError("There's nothing here", 403)
	}
	return basePath, nil
}
