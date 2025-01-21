package model

/*
 * Implementation of a webdav.FileSystem: https://godoc.org/golang.org/x/net/webdav#FileSystem that is used
 * to generate our webdav server.
 * A lot of memoization is happening so that we don't DDOS the underlying storage which was important
 * considering most webdav client within OS are extremely greedy in HTTP request
 */

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/net/webdav"
)

var webdav_cache AppCache

func init() {
	webdav_cache = NewQuickCache(20, 10)
	webdav_cache.OnEvict(func(filename string, _ interface{}) {
		os.Remove(filename)
	})
}

type WebdavFs struct {
	req        *http.Request
	backend    IBackend
	path       string
	id         string
	chroot     string
	webdavFile *WebdavFile
}

func NewWebdavFs(b IBackend, primaryKey string, chroot string, req *http.Request) *WebdavFs {
	return &WebdavFs{
		backend: b,
		id:      primaryKey,
		chroot:  chroot,
		req:     req,
	}
}

func (this WebdavFs) Mkdir(ctx context.Context, name string, perm os.FileMode) error {
	if name = this.fullpath(name); name == "" {
		return os.ErrNotExist
	}
	return this.backend.Mkdir(name)
}

func (this *WebdavFs) OpenFile(ctx context.Context, name string, flag int, perm os.FileMode) (webdav.File, error) {
	cachePath := filepath.Join(GetAbsolutePath(TMP_PATH), "webdav_"+Hash(this.id+name, 20))
	fwriteFile := func() *os.File {
		if this.req.Method == "PUT" {
			f, err := os.OpenFile(cachePath+"_writer", os.O_WRONLY|os.O_CREATE|os.O_EXCL, os.ModePerm)
			if err != nil {
				return nil
			}
			return f
		}
		return nil
	}
	if this.webdavFile != nil {
		this.webdavFile.fwrite = fwriteFile()
		return this.webdavFile, nil
	}
	if name = this.fullpath(name); name == "" {
		return nil, os.ErrNotExist
	}
	this.webdavFile = &WebdavFile{
		path:    name,
		backend: this.backend,
		cache:   cachePath,
		fwrite:  fwriteFile(),
	}
	return this.webdavFile, nil
}

func (this WebdavFs) RemoveAll(ctx context.Context, name string) error {
	if name = this.fullpath(name); name == "" {
		return os.ErrNotExist
	}
	return this.backend.Rm(name)
}

func (this WebdavFs) Rename(ctx context.Context, oldName, newName string) error {
	if oldName = this.fullpath(oldName); oldName == "" {
		return os.ErrNotExist
	} else if newName = this.fullpath(newName); newName == "" {
		return os.ErrNotExist
	}
	return this.backend.Mv(oldName, newName)
}

func (this *WebdavFs) Stat(ctx context.Context, name string) (os.FileInfo, error) {
	if this.webdavFile != nil {
		this.webdavFile.push_to_remote_if_needed()
		return this.webdavFile.Stat()
	}
	fullname := this.fullpath(name)
	if isMicrosoftWebDAVClient(this.req) && this.req.Method == "PROPFIND" {
		if name == "" {
			fullname = this.chroot
		}
		fullname = EnforceDirectory(fullname)
	}
	if fullname == "" {
		return nil, os.ErrNotExist
	}
	this.webdavFile = &WebdavFile{
		path:    fullname,
		backend: this.backend,
		cache:   filepath.Join(GetAbsolutePath(TMP_PATH), "webdav_"+Hash(this.id+name, 20)),
	}
	return this.webdavFile.Stat()
}

func (this WebdavFs) fullpath(path string) string {
	p := filepath.Join(this.chroot, path)
	if strings.HasSuffix(path, "/") == true && strings.HasSuffix(p, "/") == false {
		p += "/"
	}
	if strings.HasPrefix(p, this.chroot) == false {
		return ""
	}
	return p
}

/*
 * Implement a webdav.File and os.Stat : https://godoc.org/golang.org/x/net/webdav#File
 */
type WebdavFile struct {
	path    string
	backend IBackend
	cache   string
	fread   *os.File
	fwrite  *os.File
	files   []os.FileInfo
}

func (this *WebdavFile) Read(p []byte) (n int, err error) {
	if strings.HasPrefix(filepath.Base(this.path), ".") {
		return 0, os.ErrNotExist
	}
	if this.fread == nil {
		if this.fread = this.pull_remote_file(); this.fread == nil {
			return -1, os.ErrInvalid
		}
	}
	return this.fread.Read(p)
}

func (this *WebdavFile) Close() error {
	if this.fread != nil {
		if this.fread.Close() == nil {
			this.fread = nil
		}
	}
	if this.fwrite != nil {
		if err := this.push_to_remote_if_needed(); err == nil {
			if this.fwrite.Close() == nil {
				this.fwrite = nil
			}
		}
	}
	return nil
}

func (this *WebdavFile) Seek(offset int64, whence int) (int64, error) {
	if this.fread == nil {
		this.fread = this.pull_remote_file()
		if this.fread == nil {
			return offset, ErrNotFound
		}
	}
	a, err := this.fread.Seek(offset, whence)
	if err != nil {
		return a, ErrNotFound
	}
	return a, nil
}

func (this *WebdavFile) Readdir(count int) ([]os.FileInfo, error) {
	if this.files != nil {
		return this.files, nil
	}
	if strings.HasPrefix(filepath.Base(this.path), ".") {
		return nil, os.ErrNotExist
	}
	f, err := this.backend.Ls(this.path)
	this.files = f
	return f, err
}

func (this *WebdavFile) Stat() (os.FileInfo, error) {
	this.push_to_remote_if_needed()
	if strings.HasSuffix(this.path, "/") {
		_, err := this.Readdir(0)
		if err != nil {
			return nil, os.ErrNotExist
		}
		return this, nil
	}
	baseDir := filepath.Base(this.path)
	files, err := this.backend.Ls(strings.TrimSuffix(this.path, baseDir))
	if err != nil {
		return nil, os.ErrNotExist
	}
	found := false
	for i := range files {
		if files[i].Name() == baseDir {
			found = true
			break
		}
	}
	if found == false {
		return nil, os.ErrNotExist
	}
	return this, nil
}

func (this *WebdavFile) Write(p []byte) (int, error) {
	if this.fwrite == nil {
		return 0, os.ErrNotExist
	}
	if strings.HasPrefix(filepath.Base(this.path), ".") {
		return 0, os.ErrNotExist
	}
	return this.fwrite.Write(p)
}

func (this WebdavFile) pull_remote_file() *os.File {
	filename := this.cache + "_reader"
	if f, err := os.OpenFile(filename, os.O_RDONLY, os.ModePerm); err == nil {
		return f
	}
	if f, err := os.OpenFile(filename, os.O_WRONLY|os.O_CREATE|os.O_EXCL, os.ModePerm); err == nil {
		if reader, err := this.backend.Cat(this.path); err == nil {
			io.Copy(f, reader)
			f.Close()
			webdav_cache.SetKey(this.cache+"_reader", nil)
			reader.Close()
			if f, err = os.OpenFile(filename, os.O_RDONLY, os.ModePerm); err == nil {
				return f
			}
			return nil
		}
		f.Close()
	}
	return nil
}

func (this *WebdavFile) push_to_remote_if_needed() error {
	if this.fwrite == nil {
		return nil
	}
	this.fwrite.Close()
	f, err := os.OpenFile(this.cache+"_writer", os.O_RDONLY, os.ModePerm)
	if err != nil {
		return err
	}
	err = this.backend.Save(this.path, f)
	if err == nil {
		if err = os.Rename(this.cache+"_writer", this.cache+"_reader"); err == nil {
			this.fwrite = nil
			webdav_cache.SetKey(this.cache+"_reader", nil)
		}
	}
	f.Close()
	return err
}

func (this WebdavFile) Name() string {
	return filepath.Base(this.path)
}

func (this *WebdavFile) Size() int64 {
	if this.fread == nil {
		if this.fread = this.pull_remote_file(); this.fread == nil {
			return 0
		}
	}
	if info, err := this.fread.Stat(); err == nil {
		return info.Size()
	}
	return 0
}

func (this WebdavFile) Mode() os.FileMode {
	return 0
}

func (this WebdavFile) ModTime() time.Time {
	return time.Now()
}
func (this WebdavFile) IsDir() bool {
	if strings.HasSuffix(this.path, "/") {
		return true
	}
	return false
}

func (this WebdavFile) Sys() interface{} {
	return nil
}

func (this WebdavFile) ETag(ctx context.Context) (string, error) {
	// Building an etag can be an expensive call if the data isn't available locally.
	// => 2 etags strategies:
	// - use a legit etag value when the data is already in our cache
	// - use a dummy value that's changing all the time when we don't have much info

	etag := Hash(fmt.Sprintf("%d%s", this.ModTime().UnixNano(), this.path), 20)
	if this.fread != nil {
		if s, err := this.fread.Stat(); err == nil {
			etag = Hash(fmt.Sprintf(`"%x%x"`, this.path, s.Size()), 20)
		}
	}
	return etag, nil
}

var lock webdav.LockSystem

func NewWebdavLock() webdav.LockSystem {
	if lock == nil {
		lock = webdav.NewMemLS()
	}
	return lock
}

func isMicrosoftWebDAVClient(req *http.Request) bool {
	return strings.HasPrefix(req.Header.Get("User-Agent"), "Microsoft-WebDAV-MiniRedir/")
}
