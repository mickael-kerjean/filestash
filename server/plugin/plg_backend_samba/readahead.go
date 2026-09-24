package plg_backend_samba

import (
	"errors"
	"io"
	"sync/atomic"

	"github.com/hirochachacha/go-smb2"
)

const (
	readaheadChunk    = 1024 * 1024
	readaheadInflight = 8
)

type readahead struct {
	f        *smb2.File
	inflight *atomic.Int32
	queue    []chan chunk
	cur      chunk
}

type chunk struct {
	data []byte
	err  error
}

func NewReadahead(f *smb2.File, inflight *atomic.Int32) io.ReadCloser {
	inflight.Add(1)
	return &readahead{f: f, inflight: inflight}
}

func (this *readahead) Seek(offset int64, whence int) (int64, error) {
	if this.queue != nil {
		return 0, errors.New("seek not supported after read")
	}
	return this.f.Seek(offset, whence)
}

func (this *readahead) Read(p []byte) (int, error) {
	for len(this.cur.data) == 0 {
		if this.cur.err != nil {
			return 0, this.cur.err
		}
		for len(this.queue) < readaheadInflight {
			this.request()
		}
		this.cur = <-this.queue[0]
		this.queue = this.queue[1:]
	}
	n := copy(p, this.cur.data)
	this.cur.data = this.cur.data[n:]
	return n, nil
}

func (this *readahead) Close() error {
	for _, c := range this.queue {
		<-c
	}
	this.inflight.Add(-1)
	return this.f.Close()
}

func (this *readahead) request() {
	c := make(chan chunk, 1)
	this.queue = append(this.queue, c)
	end, _ := this.f.Seek(readaheadChunk, io.SeekCurrent)
	go func() {
		buf := make([]byte, readaheadChunk)
		n, err := this.f.ReadAt(buf, end-readaheadChunk)
		c <- chunk{buf[:n], err}
	}()
}
