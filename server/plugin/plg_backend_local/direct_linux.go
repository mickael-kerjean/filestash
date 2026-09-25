package plg_backend_local

import (
	"errors"
	"io"
	"os"
	"unsafe"

	"golang.org/x/sys/unix"
)

const (
	directChunk   = 16 * 1024 * 1024
	directAlign   = 4096
	directMinSize = 8 * 1024 * 1024
)

type direct struct {
	f    *os.File
	ch   chan []byte
	done chan struct{}
	err  error
	cur  []byte
}

func NewDirect(f *os.File, fs os.FileInfo) io.ReadCloser {
	if fs.Size() < directMinSize {
		return f
	}
	flags, err := unix.FcntlInt(f.Fd(), unix.F_GETFL, 0)
	if err != nil {
		return f
	} else if _, err = unix.FcntlInt(f.Fd(), unix.F_SETFL, flags|unix.O_DIRECT); err != nil {
		return f
	}
	return &direct{f: f, done: make(chan struct{})}
}

func (this *direct) Seek(offset int64, whence int) (int64, error) {
	if this.ch != nil {
		return 0, errors.New("seek not supported after read")
	}
	return this.f.Seek(offset, whence)
}

func (this *direct) Read(p []byte) (int, error) {
	if this.ch == nil {
		this.ch = make(chan []byte)
		go this.fill()
	}
	for len(this.cur) == 0 {
		b, ok := <-this.ch
		if !ok {
			return 0, this.err
		}
		this.cur = b
	}
	n := copy(p, this.cur)
	this.cur = this.cur[n:]
	return n, nil
}

func (this *direct) fill() {
	defer close(this.ch)
	buf, next := alignedBuffer(directChunk), alignedBuffer(directChunk)
	start, err := this.f.Seek(0, io.SeekCurrent)
	pos := start - start%directAlign
	for err == nil {
		var n int
		n, err = this.f.ReadAt(buf, pos)
		skip := min(max(start-pos, 0), int64(n))
		select {
		case this.ch <- buf[skip:n]:
		case <-this.done:
			return
		}
		pos += int64(n)
		buf, next = next, buf
	}
	this.err = err
}

func alignedBuffer(size int) []byte {
	b := make([]byte, size+directAlign)
	off := directAlign - int(uintptr(unsafe.Pointer(&b[0]))%directAlign)
	return b[off : off+size]
}

func (this *direct) Close() error {
	select {
	case <-this.done:
		return os.ErrClosed
	default:
	}
	close(this.done)
	return this.f.Close()
}
