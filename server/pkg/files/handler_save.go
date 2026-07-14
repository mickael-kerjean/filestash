package files

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"hash"
	"hash/crc32"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/filestash/server/pkg/permissions"
)

var chunkedUploadCache AppCache

func init() {
	initChunkedUploader()
}

func FileSave(ctx *App, res http.ResponseWriter, req *http.Request) {
	h := res.Header()
	h.Set("Cache-Control", "no-store")
	h.Set("Pragma", "no-cache")
	h.Set("Connection", "Close")

	path, err := PathBuilder(ctx, req.URL.Query().Get("path"))
	if err != nil {
		Log.Debug("files::save action=path_builder err=%s", err.Error())
		SendErrorResult(res, err)
		return
	}

	if permissions.CanEdit(ctx) == false {
		if permissions.CanUpload(ctx) == false {
			Log.Debug("files::save action=permission_upload err=permission_denied")
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		// for user who cannot edit but can upload => we want to ensure there
		// won't be any overwritten data
		root, filename := SplitPath(path)
		entries, err := ctx.Backend.Ls(root)
		if err != nil {
			Log.Debug("files::save action=permission_ls err=%s", err.Error())
			SendErrorResult(res, ErrPermissionDenied)
			return
		}
		for i := 0; i < len(entries); i++ {
			if entries[i].Name() == filename {
				Log.Debug("files::save action=permission_ls err=already_exist")
				SendErrorResult(res, ErrConflict)
				return
			}
		}
	}

	for _, auth := range Hooks.Get.AuthorisationMiddleware() {
		if err = auth.Save(ctx, path); err != nil {
			Log.Info("files::save action=middleware err=%s", err.Error())
			SendErrorResult(res, ErrNotAuthorized)
			return
		}
	}

	// There is 2 ways to save something:
	// - case1: regular upload, we just insert the file in the pipe
	proto := ""
	if _, ok := req.Header["Tus-Resumable"]; ok {
		proto = "tus"
	}
	if proto == "" && req.Method == http.MethodPost {
		since := req.Header.Get("If-Unmodified-Since")
		if since != "" {
			expected, err := http.ParseTime(since)
			if err != nil {
				Log.Debug("files::save action=precondition err=%s", err.Error())
				SendErrorResult(res, ErrNotValid)
				return
			} else if finfo, err := ctx.Backend.Stat(path); err == nil && finfo.ModTime().Unix() != expected.Unix() {
				SendErrorResult(res, NewError("Modified since", http.StatusPreconditionFailed))
				return
			}
		}
		err = ctx.Backend.Save(path, req.Body)
		req.Body.Close()
		if err != nil {
			Log.Debug("files::save action=backend_save err=%s", err.Error())
			SendErrorResult(res, NewError(err.Error(), 403))
			return
		}
		if since != "" {
			if finfo, err := ctx.Backend.Stat(path); err == nil && finfo.ModTime().Unix() > 0 {
				h.Set("Last-Modified", finfo.ModTime().UTC().Format(http.TimeFormat))
			}
		}
		SendSuccessResult(res, nil)
		return
	}

	// - case2: chunked upload using the TUS protocol: https://tus.io/protocols/resumable-upload
	cacheKey := map[string]string{
		"path":    path,
		"session": GenerateID(ctx.Session),
	}
	if proto == "tus" && req.Method == http.MethodOptions {
		h.Set("Tus-Resumable", "1.0.0")
		h.Set("Tus-Version", "1.0.0")
		h.Set("Tus-Extension", "creation,checksum")
		h.Set("Tus-Checksum-Algorithm", "sha1,crc32")
		return
	}
	if proto == "tus" && req.Method == http.MethodHead {
		c := chunkedUploadCache.Get(cacheKey)
		if c == nil {
			SendErrorResult(res, ErrNotFound)
			return
		}
		offset, length := c.(*chunkedUpload).Meta()
		h.Set("Tus-Resumable", "1.0.0")
		h.Set("Upload-Offset", fmt.Sprintf("%d", offset))
		h.Set("Upload-Length", fmt.Sprintf("%d", length))
		h.Set("Cache-Control", "no-store")
		res.WriteHeader(http.StatusNoContent)
		return
	}
	if proto == "tus" && req.Method == http.MethodPost {
		if c := chunkedUploadCache.Get(cacheKey); c != nil {
			chunkedUploadCache.Del(cacheKey)
		}
		size, err := strconv.ParseUint(req.Header.Get("Upload-Length"), 10, 0)
		if err != nil {
			Log.Debug("files::save::tus action=backend_save step=header_check_post err=%s", err.Error())
			SendErrorResult(res, ErrNotValid)
			return
		}
		ctx.Context = context.Background()
		b, err := ctx.Backend.Init(ctx.Session, ctx)
		if err != nil {
			Log.Debug("files::save::tus action=backend_save step=backend_init err=%s", err.Error())
			SendErrorResult(res, ErrNotValid)
			return
		}
		uploader := createChunkedUploader(b.Save, path, size)
		chunkedUploadCache.Set(cacheKey, uploader)
		h.Set("Tus-Resumable", "1.0.0")
		h.Set("Content-Length", "0")
		h.Set("Location", req.URL.String())
		res.WriteHeader(http.StatusCreated)
		return
	}
	if proto == "tus" && req.Method == http.MethodPatch {
		if req.Header.Get("Content-Type") != "application/offset+octet-stream" {
			SendErrorResult(res, NewError("Unsupported Media Type", 415))
			return
		}
		var (
			hash             hash.Hash
			expectedChecksum string
		)
		if checksumHeader := req.Header.Get("upload-checksum"); checksumHeader != "" {
			parts := strings.SplitN(checksumHeader, " ", 2)
			if len(parts) != 2 {
				SendErrorResult(res, NewError("Bad Request", 400))
				return
			} else if parts[0] == "sha1" {
				hash = sha1.New()
			} else if parts[0] == "crc32" {
				hash = crc32.NewIEEE()
			} else {
				SendErrorResult(res, NewError("Bad Request", 400))
				return
			}
			expectedChecksum = parts[1]
		}
		requestOffset, err := strconv.ParseUint(req.Header.Get("Upload-Offset"), 10, 0)
		if err != nil {
			Log.Debug("files::save::tus action=backend_save step=header_check_patch err=%s", err.Error())
			SendErrorResult(res, ErrNotValid)
			return
		}
		c := chunkedUploadCache.Get(cacheKey)
		if c == nil {
			Log.Debug("files::save::tus action=backend_save step=cache_fetch_patch")
			SendErrorResult(res, NewError("Conflict", 409))
			return
		}
		uploader := c.(*chunkedUpload)
		initialOffset, totalSize := uploader.Meta()
		if initialOffset != requestOffset {
			Log.Debug("files::save::tus action=uploader.next path=%s err=offset_missmatch", path)
			SendErrorResult(res, ErrNotValid)
			return
		}
		reader := req.Body
		if hash != nil {
			reader = io.NopCloser(io.TeeReader(req.Body, hash))
		}
		if err := uploader.Next(reader); err != nil {
			Log.Debug("files::save::tus action=uploader.next path=%s err=%s", path, err.Error())
			SendErrorResult(res, NewError(err.Error(), 403))
			return
		}
		if hash != nil && expectedChecksum != hex.EncodeToString(hash.Sum(nil)) {
			SendErrorResult(res, NewError("Checksum Mismatch", 460))
			return
		}
		newOffset, _ := uploader.Meta()
		if newOffset > totalSize {
			uploader.Close()
			chunkedUploadCache.Del(cacheKey)
			Log.Warning("files::save::tus path=%s err=assert_offset size=%d old_offset=%d new_offset=%d", path, totalSize, initialOffset, newOffset)
			SendErrorResult(res, NewError("aborted - offset larger than total size", 403))
			return
		} else if newOffset == totalSize {
			if err := uploader.Close(); err != nil {
				Log.Debug("files::save::tus action=uploader.close err=%s", err.Error())
				SendErrorResult(res, ErrNotValid)
				return
			}
			chunkedUploadCache.Del(cacheKey)
		}
		h.Set("Tus-Resumable", "1.0.0")
		h.Set("Upload-Offset", fmt.Sprintf("%d", newOffset))
		res.WriteHeader(http.StatusNoContent)
		return
	}
	SendErrorResult(res, ErrNotImplemented)
}

func createChunkedUploader(save func(path string, file io.Reader) error, path string, size uint64) *chunkedUpload {
	r, w := io.Pipe()
	done := make(chan error, 1)
	go func() {
		done <- save(path, r)
	}()
	return &chunkedUpload{
		fn:     save,
		stream: w,
		done:   done,
		offset: 0,
		size:   size,
	}
}

func initChunkedUploader() {
	chunkedUploadCache = NewAppCache(60*24, 1)
	chunkedUploadCache.OnEvict(func(key string, value interface{}) {
		c := value.(*chunkedUpload)
		if c == nil {
			Log.Warning("ctrl::files::chunked::cleanup nil on close")
			return
		}
		if err := c.Close(); err != nil {
			Log.Warning("ctrl::files::chunked::cleanup action=close err=%s", err.Error())
			return
		}
	})
}

type chunkedUpload struct {
	fn     func(path string, file io.Reader) error
	stream *io.PipeWriter
	offset uint64
	size   uint64
	done   chan error
	once   sync.Once
	mu     sync.Mutex
}

func (this *chunkedUpload) Next(body io.ReadCloser) error {
	n, err := io.Copy(this.stream, body)
	body.Close()
	this.mu.Lock()
	this.offset += uint64(n)
	this.mu.Unlock()
	return err
}

func (this *chunkedUpload) Close() error {
	this.stream.Close()
	err := <-this.done
	this.once.Do(func() {
		close(this.done)
	})
	return err
}

func (this *chunkedUpload) Meta() (uint64, uint64) {
	this.mu.Lock()
	defer this.mu.Unlock()
	return this.offset, this.size
}
