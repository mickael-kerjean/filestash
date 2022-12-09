package dicomio

import (
	"encoding/binary"
	"io"
)

// Writer is a lower level encoder that manages writing out entities to an
// io.Reader.
type Writer struct {
	out      io.Writer
	bo       binary.ByteOrder
	implicit bool
}

// NewWriter initializes and returns a Writer.
func NewWriter(out io.Writer, bo binary.ByteOrder, implicit bool) Writer {
	return Writer{
		out:      out,
		bo:       bo,
		implicit: implicit,
	}
}

// SetTransferSyntax sets the current transfer syntax of this Writer.
func (w *Writer) SetTransferSyntax(bo binary.ByteOrder, implicit bool) {
	w.bo = bo
	w.implicit = implicit
}

// GetTransferSyntax gets the current transfer syntax of this Writer.
func (w *Writer) GetTransferSyntax() (binary.ByteOrder, bool) {
	return w.bo, w.implicit
}

// WriteZeros writes len bytes of zeros at the current position of the Writer.
func (w *Writer) WriteZeros(len int) error {
	zeros := make([]byte, len)
	_, err := w.out.Write(zeros)
	return err
}

// WriteString writes the provided string to the Writer.
func (w *Writer) WriteString(v string) error {
	_, err := w.out.Write([]byte(v))
	return err
}

// WriteByte writes the provided byte to the Writer.
func (w *Writer) WriteByte(v byte) error {
	return binary.Write(w.out, w.bo, &v)
}

// WriteBytes writes the provided byte slice to the Writer.
func (w *Writer) WriteBytes(v []byte) error {
	_, err := w.out.Write(v)
	return err
}

// WriteUInt16 writes the provided uint16 to the Writer.
func (w *Writer) WriteUInt16(v uint16) error {
	return binary.Write(w.out, w.bo, &v)
}

// WriteUInt32 writes the provided uint32 to the Writer.
func (w *Writer) WriteUInt32(v uint32) error {
	return binary.Write(w.out, w.bo, &v)
}

// WriteFloat32 writes the provided float32 to the Writer.
func (w *Writer) WriteFloat32(v float32) error {
	return binary.Write(w.out, w.bo, &v)
}

// WriteFloat64 writes the provided float64 to the Writer.
func (w *Writer) WriteFloat64(v float64) error {
	return binary.Write(w.out, w.bo, &v)
}
