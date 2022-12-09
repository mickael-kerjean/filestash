package dicomio

import (
	"bufio"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"io/ioutil"

	"github.com/suyashkumar/dicom/pkg/charset"
	"golang.org/x/text/encoding"
)

var (
	// ErrorInsufficientBytesLeft indicates there are not enough bytes left in
	// the current buffer (or enough bytes left until the currently set limit)
	// to complete the operation.
	ErrorInsufficientBytesLeft = errors.New("not enough bytes left until buffer limit to complete this operation")
)

// Reader provides common functionality for reading underlying DICOM data.
type Reader interface {
	io.Reader
	// ReadUInt8 reads a uint16 from the underlying reader.
	ReadUInt8() (uint8, error)
	// ReadUInt16 reads a uint16 from the underlying reader.
	ReadUInt16() (uint16, error)
	// ReadUInt32 reads a uint32 from the underlying reader.
	ReadUInt32() (uint32, error)
	// ReadInt16 reads a int16 from the underlying reader.
	ReadInt16() (int16, error)
	// ReadInt32 reads a int32 from the underlying reader.
	ReadInt32() (int32, error)
	// ReadFloat32 reads a float32 from the underlying reader.
	ReadFloat32() (float32, error)
	// ReadFloat64 reads a float32 from the underlying reader.
	ReadFloat64() (float64, error)
	// ReadString reads an n byte string from the underlying reader.
	// Uses the charset.CodingSystem encoding decoders to read the string, if
	// set.
	ReadString(n uint32) (string, error)
	// Skip skips the reader ahead by n bytes.
	Skip(n int64) error
	// Peek returns the next n bytes without advancing the reader. This will
	// return bufio.ErrBufferFull if the buffer is full.
	Peek(n int) ([]byte, error)
	// PushLimit sets a read limit of n bytes from the current position of the
	// reader. Once the limit is reached, IsLimitExhausted will return true, and
	// other attempts to read data from dicomio.Reader will return io.EOF.
	PushLimit(n int64) error
	// PopLimit removes the most recent limit set, and restores the limit before
	// that one.
	PopLimit()
	// IsLimitExhausted indicates whether or not we have read up to the
	// currently set limit position.
	IsLimitExhausted() bool
	// BytesLeftUntilLimit returns the number of bytes remaining until we reach
	// the currently set limit position.
	BytesLeftUntilLimit() int64
	// SetTransferSyntax sets the byte order and whether the current transfer
	// syntax is implicit or not.
	SetTransferSyntax(bo binary.ByteOrder, implicit bool)
	// IsImplicit returns if the currently set transfer syntax on this Reader is
	// implicit or not.
	IsImplicit() bool
	// SetCodingSystem sets the charset.CodingSystem to be used when ReadString
	// is called.
	SetCodingSystem(cs charset.CodingSystem)
	ByteOrder() binary.ByteOrder
}

type reader struct {
	in         *bufio.Reader
	bo         binary.ByteOrder
	implicit   bool
	limit      int64
	bytesRead  int64
	limitStack []int64
	// cs represents the CodingSystem to use when reading the string. If a
	// particular encoding.Decoder within this CodingSystem is nil, assume
	// ASCII.
	cs charset.CodingSystem
}

// NewReader creates and returns a new dicomio.Reader.
func NewReader(in *bufio.Reader, bo binary.ByteOrder, limit int64) (Reader, error) {
	return &reader{
		in:        in,
		bo:        bo,
		limit:     limit,
		bytesRead: 0,
	}, nil
}

func (r *reader) BytesLeftUntilLimit() int64 {
	return r.limit - r.bytesRead
}

func (r *reader) Read(p []byte) (int, error) {
	// Check if we've hit the limit
	if r.BytesLeftUntilLimit() <= 0 {
		if len(p) == 0 {
			return 0, nil
		}
		return 0, io.EOF
	}

	// If asking for more than we have left, just return whatever we've got left
	// TODO: return a special kind of error if this situation occurs to inform the caller
	if int64(len(p)) > r.BytesLeftUntilLimit() {
		p = p[:r.BytesLeftUntilLimit()]
	}
	n, err := r.in.Read(p)
	if n >= 0 {
		r.bytesRead += int64(n)
	}
	return n, err
}

func (r *reader) ReadUInt8() (uint8, error) {
	var out uint8
	err := binary.Read(r, r.bo, &out)
	return out, err
}

func (r *reader) ReadUInt16() (uint16, error) {
	var out uint16
	err := binary.Read(r, r.bo, &out)
	return out, err
}

func (r *reader) ReadUInt32() (uint32, error) {
	var out uint32
	err := binary.Read(r, r.bo, &out)
	return out, err
}

func (r *reader) ReadInt16() (int16, error) {
	var out int16
	err := binary.Read(r, r.bo, &out)
	return out, err
}

func (r *reader) ReadInt32() (int32, error) {
	var out int32
	err := binary.Read(r, r.bo, &out)
	return out, err
}

func (r *reader) ReadFloat32() (float32, error) {
	var out float32
	err := binary.Read(r, r.bo, &out)
	return out, err
}

func (r *reader) ReadFloat64() (float64, error) {
	var out float64
	err := binary.Read(r, r.bo, &out)
	return out, err
}

func internalReadString(data []byte, d *encoding.Decoder) (string, error) {
	if len(data) == 0 {
		return "", nil
	}
	if d == nil {
		// Assume ASCII
		return string(data), nil
	}
	bytes, err := d.Bytes(data)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func (r *reader) ReadString(n uint32) (string, error) {
	data := make([]byte, n)
	_, err := io.ReadFull(r, data)
	if err != nil {
		return "", err
	}
	return internalReadString(data, r.cs.Ideographic)
}
func (r *reader) Skip(n int64) error {
	if r.BytesLeftUntilLimit() < n {
		// not enough left to skip
		return ErrorInsufficientBytesLeft
	}

	_, err := io.CopyN(ioutil.Discard, r, n)

	return err
}

// PushLimit creates a limit n bytes from the current position
func (r *reader) PushLimit(n int64) error {
	newLimit := r.bytesRead + n
	if newLimit > r.limit {
		return fmt.Errorf("new limit exceeds current limit of buffer, new limit: %d, limit: %d", newLimit, r.limit)
	}

	// Add current limit to the stack
	r.limitStack = append(r.limitStack, r.limit)
	r.limit = newLimit
	return nil
}
func (r *reader) PopLimit() {
	if r.bytesRead < r.limit {
		// didn't read all the way to the limit, so skip over what's left.
		_ = r.Skip(r.limit - r.bytesRead)
	}
	// TODO: return an error if trying to Pop the last limit off the slice
	last := len(r.limitStack) - 1
	r.limit = r.limitStack[last]
	r.limitStack = r.limitStack[:last]
}

func (r *reader) IsLimitExhausted() bool {
	return r.BytesLeftUntilLimit() <= 0
}

func (r *reader) SetTransferSyntax(bo binary.ByteOrder, implicit bool) {
	r.bo = bo
	r.implicit = implicit
}

func (r *reader) IsImplicit() bool { return r.implicit }

func (r *reader) SetCodingSystem(cs charset.CodingSystem) {
	r.cs = cs
}

func (r *reader) Peek(n int) ([]byte, error) {
	return r.in.Peek(n)
}

func (r *reader) ByteOrder() binary.ByteOrder {
	return r.bo
}
