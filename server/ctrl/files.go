package ctrl

import (
	"encoding/base64"
	"fmt"
	"hash/fnv"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/model"
	"io"
	"net/http"
	"os"
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

var FileCache AppCache

func init() {
	FileCache = NewAppCache()
	cachePath := filepath.Join(GetCurrentDir(), TMP_PATH)
	FileCache.OnEvict(func(key string, value interface{}) {
		os.RemoveAll(filepath.Join(cachePath, key))
	})
}

func FileLs(ctx App, res http.ResponseWriter, req *http.Request) {
	if model.CanRead(&ctx) == false {
		if model.CanUpload(&ctx) == false {
			SendErrorResult(res, ErrPermissionDenied)
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
	go model.SProc.HintLs(&ctx, path)

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

	etagValue := base64.StdEncoding.EncodeToString(etagger.Sum(nil))
	res.Header().Set("Etag", etagValue)
	if etagValue != "" && req.Header.Get("If-None-Match") == etagValue {
		res.WriteHeader(http.StatusNotModified)
		return
	}
	SendSuccessResultsWithMetadata(res, files, perms)
}

func FileCat(ctx App, res http.ResponseWriter, req *http.Request) {
	header := res.Header()
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

	var file io.ReadCloser
	var contentLength int64 = -1
	var needToCreateCache bool = false

	// use our cache if necessary (range request) when possible
	if req.Header.Get("range") != "" {
		ctx.Session["_path"] = path
		if p := FileCache.Get(ctx.Session); p != nil {
			f, err := os.OpenFile(p.(string), os.O_RDONLY, os.ModePerm);
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
			SendErrorResult(res, err)
			return
		}
		if req.Header.Get("range") != "" {
			needToCreateCache = true
		}
		go model.SProc.HintLs(&ctx, filepath.Dir(path) + "/")
	}

	// plugin hooks
	for _, obj := range Hooks.Get.ProcessFileContentBeforeSend() {
		if file, err = obj(file, &ctx, &res, req); err != nil {
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
			tmpPath := filepath.Join(GetCurrentDir(), filepath.Join(GetCurrentDir(), TMP_PATH), "file_" + QuickString(20) + ".dat")
			f, err := os.OpenFile(tmpPath, os.O_RDWR|os.O_CREATE, os.ModePerm);
			if err != nil {
				SendErrorResult(res, err)
				return
			}
			if _, err = io.Copy(f, file); err != nil {
				f.Close()
				file.Close()
				SendErrorResult(res, err)
				return
			}
			f.Close()
			file.Close()
			if f, err = os.OpenFile(tmpPath, os.O_RDONLY, os.ModePerm); err != nil {
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

			if start != -1 && end != -1 && end - start >= 0 {
				ranges = append(ranges, []int64{start, end})
			}
		}
	}

	// publish headers
	if contentLength != -1 {
		header.Set("Content-Length", fmt.Sprintf("%d", contentLength))
	}
	header.Set("Content-Type", GetMimeType(req.URL.Query().Get("path")))
	if header.Get("Content-Security-Policy") == "" {
		header.Set("Content-Security-Policy", "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'")
	}
	header.Set("Accept-Ranges", "bytes")

	// Send data to the client
	if req.Method != "HEAD" {
		if f, ok := file.(io.ReadSeeker); ok && len(ranges) > 0 {
			if _, err = f.Seek(ranges[0][0], io.SeekStart); err == nil {
				header.Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", ranges[0][0], ranges[0][1], contentLength))
				header.Set("Content-Length", fmt.Sprintf("%d", ranges[0][1] - ranges[0][0] + 1))
				res.WriteHeader(http.StatusPartialContent)
				io.CopyN(res, f, ranges[0][1] - ranges[0][0] + 1)
			} else {
				res.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
			}
		} else {
			io.Copy(res, file)
		}
	}
	file.Close()
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
	header := res.Header()
	header.Set("Allow", strings.Join(allowed, ", "))
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
	file.Close()
	if err != nil {
		SendErrorResult(res, NewError(err.Error(), 403))
		return
	}
	go model.SProc.HintLs(&ctx, filepath.Dir(path) + "/")
	go model.SProc.HintFile(&ctx, path)
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

	go model.SProc.HintRm(&ctx, filepath.Dir(from) + "/")
	go model.SProc.HintLs(&ctx, filepath.Dir(to) + "/")
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
	model.SProc.HintRm(&ctx, path)
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
	go model.SProc.HintLs(&ctx, filepath.Dir(path) + "/")
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
	go model.SProc.HintLs(&ctx, filepath.Dir(path) + "/")
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
