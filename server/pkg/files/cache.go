package files

import (
	"io"
	"maps"
	"os"

	. "github.com/mickael-kerjean/filestash/server/pkg/core"
	. "github.com/mickael-kerjean/filestash/server/pkg/env"
	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

var cache = fileCache{index: NewAppCache()}

func init() {
	cache.index.OnEvict(func(_ string, value any) {
		if entry, ok := value.(fileCacheEntry); ok {
			os.Truncate(entry.path, 0)
			os.Remove(entry.path)
		}
	})
}

type fileCache struct {
	index AppCache
}

type fileCacheEntry struct {
	path  string
	mtime string
	size  int64
}

func (this *fileCache) Open(ctx *App, path string, mtime string) (*os.File, int64, bool) {
	key := this.key(ctx, path)
	entry, ok := this.index.Get(key).(fileCacheEntry)
	if !ok || entry.mtime != mtime {
		this.index.Del(key)
		return nil, 0, false
	}
	f, err := os.Open(entry.path)
	return f, entry.size, err == nil
}

func (this *fileCache) Create(ctx *App, path string, mtime string, r io.ReadCloser) (*os.File, int64, error) {
	defer r.Close()
	f, err := os.CreateTemp(GetAbsolutePath(TMP_PATH), "file_*.dat")
	if err != nil {
		return nil, 0, err
	}
	size, err := io.Copy(f, r)
	if err == nil {
		_, err = f.Seek(0, io.SeekStart)
	}
	if err != nil {
		f.Close()
		os.Remove(f.Name())
		return nil, 0, err
	}
	this.index.Set(this.key(ctx, path), fileCacheEntry{path: f.Name(), mtime: mtime, size: size})
	return f, size, nil
}

func (this *fileCache) key(ctx *App, path string) map[string]string {
	key := map[string]string{}
	maps.Copy(key, ctx.Session)
	key["fullpath"] = path
	return key
}
