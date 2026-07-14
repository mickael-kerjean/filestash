package files

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

var file_cache AppCache

func init() {
	file_cache = NewAppCache()
	file_cache.OnEvict(func(key string, value interface{}) {
		os.RemoveAll(filepath.Join(GetAbsolutePath(TMP_PATH), key))
	})
}

func FileCat(ctx *App, res http.ResponseWriter, req *http.Request) {
	var (
		file              io.ReadCloser
		fileMutation      bool        = false
		contentLength     int64       = -1
		needToCreateCache bool        = false
		query             url.Values  = req.URL.Query()
		header            http.Header = res.Header()
	)
	http.SetCookie(res, &http.Cookie{
		Name:   "download",
		Value:  "",
		MaxAge: -1,
		Path:   "/",
	})
	if permissions.CanRead(ctx) == false {
		Log.Debug("cat::permission 'permission denied'")
		SendErrorResult(res, ErrPermissionDenied)
		return
	}
	path, err := PathBuilder(ctx, query.Get("path"))
	if err != nil {
		Log.Debug("cat::path '%s'", err.Error())
		SendErrorResult(res, err)
		return
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if req.Method == http.MethodHead {
			if err = auth.Stat(ctx, path); err != nil {
				SendErrorResult(res, ErrNotAuthorized)
				return
			}
		} else if err = auth.Cat(ctx, path); err != nil {
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	// use our cache if necessary (range request) when possible
	if req.Header.Get("range") != "" {
		ctx.Session["fullpath"] = path
		if p := file_cache.Get(ctx.Session); p != nil {
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
	mType := GetMimeType(query.Get("path"))
	if file == nil {
		if file, err = ctx.Backend.Cat(path); err != nil {
			if req.Method == http.MethodHead {
				if finfo, err := ctx.Backend.Stat(path); err == nil && finfo.IsDir() {
					if finfo.ModTime().Unix() > 0 {
						header.Set("Last-Modified", finfo.ModTime().UTC().Format(http.TimeFormat))
					}
					header.Set("Content-Type", "inode/directory")
					res.WriteHeader(http.StatusNoContent)
					return
				}
			}
			Log.Debug("cat::backend '%s'", err.Error())
			SendErrorResult(res, err)
			return
		}
		if mType == "application/javascript" {
			mType = "text/plain"
		}
		header.Set("Content-Type", mType)
		if req.Header.Get("range") != "" {
			needToCreateCache = true
		}
	}

	// plugin hooks
	thumb := query.Get("thumbnail")
	if thumb == "true" {
		fileMutation = true
		if finfo, err := ctx.Backend.Stat(path); err == nil && finfo.ModTime().Unix() > 0 {
			lm := finfo.ModTime().UTC().Format(http.TimeFormat)
			if lm == req.Header.Get("If-Modified-Since") {
				res.WriteHeader(http.StatusNotModified)
				return
			}
			header.Set("Last-Modified", lm)
		}
		for plgMType, plgHandler := range Hooks.Get.Thumbnailer() {
			if plgMType != mType {
				continue
			}
			file, err = plgHandler.Generate(file, ctx, &res, req)
			if err != nil {
				if req.Context().Err() == nil {
					Log.Debug("cat::thumbnailer '%s'", err.Error())
				}
				SendErrorResult(res, err)
				return
			}
			break
		}
	}
	for _, obj := range Hooks.Get.ProcessFileContentBeforeSend() {
		f, changed, err := obj(file, ctx, &res, req)
		if err != nil {
			Log.Debug("cat::hooks '%s'", err.Error())
			SendErrorResult(res, err)
			return
		} else if changed {
			file = f
			fileMutation = true
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
			tmpPath := GetAbsolutePath(TMP_PATH, "file_"+QuickString(20)+".dat")
			f, err := os.OpenFile(tmpPath, os.O_RDWR|os.O_CREATE, os.ModePerm)
			if err != nil {
				Log.Debug("cat::range0 '%s'", err.Error())
				SendErrorResult(res, err)
				return
			}
			file_cache.Set(ctx.Session, tmpPath)
			if _, err = io.Copy(f, file); err != nil {
				f.Close()
				file.Close()
				Log.Debug("cat::range1 '%s'", err.Error())
				SendErrorResult(res, err)
				return
			}
			if err = f.Sync(); err != nil {
				f.Close()
				file.Close()
				Log.Debug("cat::range2 '%s'", err.Error())
				SendErrorResult(res, err)
				return
			}
			f.Close()
			file.Close()
			if f, err = os.OpenFile(tmpPath, os.O_RDONLY, os.ModePerm); err != nil {
				Log.Debug("cat::range3 '%s'", err.Error())
				SendErrorResult(res, err)
				return
			}
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
	} else if fileMutation == false && contentLength < 0 {
		if finfo, err := ctx.Backend.Stat(path); err == nil {
			if finfo.ModTime().Unix() > 0 {
				header.Set("Last-Modified", finfo.ModTime().UTC().Format(http.TimeFormat))
			}
			if finfo.IsDir() {
				header.Set("Content-Type", "inode/directory")
				if req.Method == http.MethodHead {
					res.WriteHeader(http.StatusNoContent)
					return
				}
				SendErrorResult(res, ErrNotFound)
				return
			}
			contentLength = finfo.Size()
		}
	}

	// publish headers
	if contentLength >= 0 {
		header.Set("Content-Length", fmt.Sprintf("%d", contentLength))
	}
	if disable_csp() == false {
		header.Set("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; font-src data:; script-src-elem 'self'")
	}
	if fname := query.Get("name"); fname != "" {
		header.Set("Content-Disposition", "attachment; filename=\""+fname+"\"")
	}
	header.Set("Accept-Ranges", "bytes")

	if req.Method != http.MethodHead {
		size := 32
		if thumb != "true" {
			switch Config.Get("general.buffer_size").String() {
			case "small":
				size = 32
			case "medium":
				size = 128
			case "large":
				size = 2 * 1024
			}
		}
		buf := make([]byte, size*1024)
		if f, ok := file.(io.ReadSeeker); ok && len(ranges) > 0 {
			if _, err = f.Seek(ranges[0][0], io.SeekStart); err == nil {
				header.Set("Content-Range", fmt.Sprintf("bytes %d-%d/%d", ranges[0][0], ranges[0][1], contentLength))
				header.Set("Content-Length", fmt.Sprintf("%d", ranges[0][1]-ranges[0][0]+1))
				res.WriteHeader(http.StatusPartialContent)
				io.CopyBuffer(res, io.LimitReader(f, ranges[0][1]-ranges[0][0]+1), buf)
			} else {
				res.WriteHeader(http.StatusRequestedRangeNotSatisfiable)
			}
		} else {
			io.CopyBuffer(res, file, buf)
		}
	}
	file.Close()
}
