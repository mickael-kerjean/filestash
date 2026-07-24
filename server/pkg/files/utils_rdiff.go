package files

import (
	"errors"
	"io"
	"math"

	"github.com/balena-os/librsync-go"
)

func rdiffSignature(input io.Reader, output io.Writer) error {
	_, err := librsync.Signature(input, output, 4096, 16, librsync.MD4_SIG_MAGIC)
	return err
}

func rdiffPatch(remote io.Reader, delta io.Reader, output io.Writer) error {
	base := &rdiffBase{src: remote}
	if err := librsync.Patch(io.NewSectionReader(base, 0, math.MaxInt64), delta, output); err != nil {
		return err
	}
	return base.err
}

type rdiffBase struct {
	src io.Reader
	pos int64
	err error
}

func (this *rdiffBase) ReadAt(p []byte, off int64) (int, error) {
	if this.err != nil {
		return 0, this.err
	} else if off < this.pos {
		this.err = errors.New("non monotonic access to the base file")
		return 0, this.err
	} else if _, err := io.CopyN(io.Discard, this.src, off-this.pos); err != nil {
		this.err = err
		return 0, err
	}
	n, err := io.ReadFull(this.src, p)
	this.pos = off + int64(n)
	return n, err
}
