package model

import (
	"context"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"github.com/mickael-kerjean/net/webdav"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const DAVCachePath = "data/cache/webdav/"
var cachePath string

func init() {
	cachePath = filepath.Join(GetCurrentDir(), DAVCachePath) + "/"
	os.RemoveAll(cachePath)
	os.MkdirAll(cachePath, os.ModePerm)
}

/*
 * Implement a webdav.FileSystem: https://godoc.org/golang.org/x/net/webdav#FileSystem
 */
type WebdavFs struct {
	backend IBackend
	path    string
	id      string
	chroot  string
}

func NewWebdavFs(b IBackend, primaryKey string, chroot string) WebdavFs {
	return WebdavFs{
		backend: b,
		id:      primaryKey,
		chroot:  chroot,
	}
}

func (this WebdavFs) Mkdir(ctx context.Context, name string, perm os.FileMode) error {
	if name = this.fullpath(name); name == "" {
		return os.ErrNotExist
	}
	return this.backend.Mkdir(name)
}

func (this WebdavFs) OpenFile(ctx context.Context, name string, flag int, perm os.FileMode) (webdav.File, error) {
	if name = this.fullpath(name); name == "" {
		return nil, os.ErrNotExist
	}
	return &WebdavFile{
		path: name,
		backend: this.backend,
		cache: fmt.Sprintf("%stmp_%s", cachePath, Hash(this.id + name, 20)),
	}, nil
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

func (this WebdavFs) Stat(ctx context.Context, name string) (os.FileInfo, error) {
	if name = this.fullpath(name); name == "" {
		return nil, os.ErrNotExist
	}
	return WebdavFile{
		path: name,
		backend: this.backend,
		cache: fmt.Sprintf("%stmp_%s", cachePath, Hash(this.id + name, 20)),
	}.Stat()
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
		name := this.fread.Name()
		if this.fread.Close() == nil {
			this.fread = nil
		}
		if this.fwrite != nil {
			// while writing something, we flush any cache to avoid being out of sync
			os.Remove(name)
			return nil
		}
	}
	if this.fwrite != nil {
		// save the cache that's been written to disk in the remote storage
		name := this.fwrite.Name()
		if this.fwrite.Close() == nil {
			this.fwrite = nil
		}
		if f, err := os.OpenFile(name+"_writer", os.O_RDONLY, os.ModePerm); err == nil {
			this.backend.Save(this.path, f)
			f.Close()
		}
		os.Remove(name)
	}
	return nil
}

func (this *WebdavFile) Seek(offset int64, whence int) (int64, error) {
	if this.fread == nil {
		this.fread = this.pull_remote_file();
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

func (this WebdavFile) Readdir(count int) ([]os.FileInfo, error) {
	if strings.HasPrefix(filepath.Base(this.path), ".") {
		return nil, os.ErrNotExist
	}
	return this.backend.Ls(this.path)
}

func (this WebdavFile) Stat() (os.FileInfo, error) {
	return &this, nil
}

func (this *WebdavFile) Write(p []byte) (int, error) {
	if strings.HasPrefix(filepath.Base(this.path), ".") {
		return 0, os.ErrNotExist
	}
	if this.fwrite == nil {
		f, err := os.OpenFile(this.cache+"_writer", os.O_WRONLY|os.O_CREATE|os.O_EXCL, os.ModePerm);
		if err != nil {
			return 0, os.ErrInvalid
		}
		this.fwrite = f
	}
	return this.fwrite.Write(p)
}

func (this WebdavFile) pull_remote_file() *os.File {
	filename := this.cache+"_reader"
	defer removeIn2Minutes(filename)
	if f, err := os.OpenFile(filename, os.O_RDONLY, os.ModePerm); err == nil {
		return f
	}
	if f, err := os.OpenFile(filename, os.O_WRONLY|os.O_CREATE|os.O_EXCL, os.ModePerm); err == nil {
		if reader, err := this.backend.Cat(this.path); err == nil {
			io.Copy(f, reader)
			f.Close()
			if obj, ok := reader.(interface{ Close() error }); ok {
				obj.Close()
			}
			if f, err = os.OpenFile(filename, os.O_RDONLY, os.ModePerm); err == nil {
				return f
			}
			return nil
		}
		f.Close()
	}
	return nil
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

func removeIn2Minutes(name string) {
	go func(){
		time.Sleep(120 * time.Second)
		os.Remove(name)
	}()
}
