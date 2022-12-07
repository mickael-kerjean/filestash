// Copyright (C) 2021 Storj Labs, Inc.
// See LICENSE for copying information.

package drpcwire

import (
	"io"

	"storj.io/drpc"
)

// Reader reconstructs packets from frames read from an io.Reader.
type Reader struct {
	r    io.Reader
	curr []byte
	buf  []byte
	id   ID
}

const maximumFrameSize = 4<<20 + 1 + 9 + 9 + 9

// NewReader constructs a Reader to read Packets from the io.Reader.
func NewReader(r io.Reader) *Reader {
	return &Reader{
		r:    r,
		curr: make([]byte, 0, 64*1024),
		id:   ID{Stream: 1, Message: 1},
	}
}

// ReadPacket reads a packet from the io.Reader. It is equivalent to
// calling ReadPacketUsing(nil).
func (r *Reader) ReadPacket() (pkt Packet, err error) {
	return r.ReadPacketUsing(nil)
}

// ReadPacketUsing reads a packet from the io.Reader. IDs read from
// frames must be monotonically increasing. When a new ID is read, the
// old data is discarded. This allows for easier asynchronous interrupts.
// If the amount of data in the Packet becomes too large, an error is
// returned. The returned packet's Data field is constructed by appending
// to the provided buf after it has been resliced to be zero length.
func (r *Reader) ReadPacketUsing(buf []byte) (pkt Packet, err error) {
	pkt.Data = buf[:0]

	var fr Frame
	var ok bool

	for {
		r.curr, fr, ok, err = ParseFrame(r.curr)
		switch {
		case err != nil:
			return Packet{}, drpc.ProtocolError.Wrap(err)

		case !ok:
			// r.curr doesn't have enough data for a full frame, so prepend
			// it to the read buffer if it is in the appropriate state.
			if len(r.buf) == 0 {
				r.buf = append(r.buf[:0], r.curr...)
			}

			if cap(r.buf)-len(r.buf) < 4096 {
				nbuf := make([]byte, len(r.buf), 2*cap(r.buf)+4096)
				copy(nbuf, r.buf)
				r.buf = nbuf
			}

			n, err := r.r.Read(r.buf[len(r.buf):cap(r.buf)])
			if err != nil {
				return Packet{}, err
			}

			ncap := uint(len(r.buf) + n)
			if ncap > uint(cap(r.buf)) {
				return Packet{}, drpc.ProtocolError.New("data overflow")
			}
			r.buf = r.buf[:ncap]

			if len(r.buf) > maximumFrameSize {
				return Packet{}, drpc.ProtocolError.New("data overflow")
			}

			r.curr = r.buf
			continue
		}

		// since we got a packet, signal that we need to restore buf with
		// whatever remains in r.curr the next time we don't have a packet.
		if len(r.buf) > 0 {
			r.buf = r.buf[:0]
		}

		switch {
		case fr.Control:
			// Ignore any frames with the control bit set so that we can
			// use it in the future to mean things to people who understand
			// it.
			continue

		case fr.ID.Less(r.id):
			return Packet{}, drpc.ProtocolError.New("id monotonicity violation")

		case r.id != fr.ID || pkt.ID == ID{}:
			r.id = fr.ID

			pkt = Packet{
				Data: pkt.Data[:0],
				ID:   fr.ID,
				Kind: fr.Kind,
			}

		case fr.Kind != pkt.Kind:
			return Packet{}, drpc.ProtocolError.New("packet kind change")
		}

		pkt.Data = append(pkt.Data, fr.Data...)

		switch {
		case len(pkt.Data) > 4<<20:
			return Packet{}, drpc.ProtocolError.New("data overflow")

		case fr.Done:
			// increment the message id so that we do not accept any frames
			// with the same id.
			r.id.Message++
			return pkt, nil
		}
	}
}
