package files

import (
	"io"
	"sync"

	. "github.com/mickael-kerjean/filestash/server/pkg/utils"
)

var chunkedUploadCache = NewAppCache(60*24, 1)

func init() {
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
