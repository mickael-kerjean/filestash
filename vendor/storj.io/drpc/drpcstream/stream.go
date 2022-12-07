// Copyright (C) 2019 Storj Labs, Inc.
// See LICENSE for copying information.

package drpcstream

import (
	"context"
	"fmt"
	"io"
	"sync"

	"github.com/zeebo/errs"

	"storj.io/drpc"
	"storj.io/drpc/drpcctx"
	"storj.io/drpc/drpcdebug"
	"storj.io/drpc/drpcenc"
	"storj.io/drpc/drpcsignal"
	"storj.io/drpc/drpcwire"
	"storj.io/drpc/internal/drpcopts"
)

// Options controls configuration settings for a stream.
type Options struct {
	// SplitSize controls the default size we split packets into frames.
	SplitSize int

	// ManualFlush controls if the stream will automatically flush after every
	// message send. Note that flushing is not part of the drpc.Stream
	// interface, so if you use this you must be ready to type assert and
	// call RawFlush dynamically.
	ManualFlush bool

	// MaximumBufferSize causes the Stream to drop any internal buffers that
	// are larger than this amount to control maximum memory usage at the
	// expense of more allocations. 0 is unlimited.
	MaximumBufferSize int

	// Internal contains options that are for internal use only.
	Internal drpcopts.Stream
}

// Stream represents an rpc actively happening on a transport.
type Stream struct {
	ctx  streamCtx
	opts Options
	term chan<- struct{}

	write inspectMutex
	read  inspectMutex

	id   drpcwire.ID
	wr   *drpcwire.Writer
	pbuf packetBuffer
	wbuf []byte

	mu   sync.Mutex // protects state transitions
	sigs struct {
		send   drpcsignal.Signal // set when done sending messages
		recv   drpcsignal.Signal // set when done receiving messages
		term   drpcsignal.Signal // set when the stream is terminating and no new ops should begin
		fin    drpcsignal.Signal // set when the stream is finished and all ops are complete
		cancel drpcsignal.Signal // set when externally canceled
	}
}

var _ drpc.Stream = (*Stream)(nil)

// New returns a new stream bound to the context with the given stream id and will
// use the writer to write messages on. It is important use monotonically increasing
// stream ids within a single transport.
func New(ctx context.Context, sid uint64, wr *drpcwire.Writer) *Stream {
	return NewWithOptions(ctx, sid, wr, Options{})
}

// NewWithOptions returns a new stream bound to the context with the given stream id
// and will use the writer to write messages on. It is important use monotonically increasing
// stream ids within a single transport. The options are used to control details of how
// the Stream operates.
func NewWithOptions(ctx context.Context, sid uint64, wr *drpcwire.Writer, opts Options) *Stream {
	s := &Stream{
		ctx: streamCtx{
			Context: ctx,
			tr:      drpcopts.GetStreamTransport(&opts.Internal),
		},
		opts: opts,
		term: drpcopts.GetStreamTerm(&opts.Internal),

		id: drpcwire.ID{Stream: sid},
		wr: wr.Reset(),
	}

	// initialize the packet buffer
	s.pbuf.init()

	return s
}

// String returns a string representation of the stream.
func (s *Stream) String() string { return fmt.Sprintf("<str %p s:%d>", s, s.id.Stream) }

func (s *Stream) log(what string, cb func() string) {
	if drpcdebug.Enabled {
		drpcdebug.Log(func() (_, _, _ string) { return s.String(), what, cb() })
	}
}

//
// context
//

// streamCtx avoids having to allocate a Done channel until it is requested.
type streamCtx struct {
	context.Context
	tr  drpc.Transport
	sig drpcsignal.Signal
}

// Value checks for the drpc.Transport key and forwards if necessary.
// We do this because using drpcctx to make a new context would cause
// an extra allocation.
func (s *streamCtx) Value(key interface{}) interface{} {
	if s.tr != nil && key == (drpcctx.TransportKey{}) {
		return s.tr
	}
	return s.Context.Value(key)
}

// Done returns the stored channel instead of the parent Done channel.
func (s *streamCtx) Done() <-chan struct{} { return s.sig.Signal() }

// Err returns the error that has been set when the done channel is closed.
func (s *streamCtx) Err() error { return s.sig.Err() }

// Context returns the context associated with the stream. It is closed when
// the Stream will no longer issue any writes or reads.
func (s *Stream) Context() context.Context { return &s.ctx }

//
// accessors
//

// ID returns the stream id.
func (s *Stream) ID() uint64 {
	if s == nil {
		return 0
	}
	return s.id.Stream
}

// Terminated returns a channel that is closed when the stream has been terminated.
func (s *Stream) Terminated() <-chan struct{} { return s.sigs.term.Signal() }

// IsTerminated returns true if the stream has been terminated.
func (s *Stream) IsTerminated() bool { return s.sigs.term.IsSet() }

// Finished returns a channel that is closed when the stream is fully finished
// and will no longer issue any writes or reads.
func (s *Stream) Finished() <-chan struct{} { return s.sigs.fin.Signal() }

// IsFinished returns true if the stream is fully finished and will no longer
// issue any writes or reads.
func (s *Stream) IsFinished() bool { return s.sigs.fin.IsSet() }

//
// packet handler
//

// HandlePacket advances the stream state machine by inspecting the packet. It returns
// any major errors that should terminate the transport the stream is operating on as
// well as a boolean indicating if the stream expects more packets.
func (s *Stream) HandlePacket(pkt drpcwire.Packet) (err error) {
	if s.sigs.term.IsSet() || pkt.ID.Stream != s.id.Stream {
		return nil
	}

	s.log("HANDLE", pkt.String)

	if pkt.Kind == drpcwire.KindMessage {
		s.pbuf.Put(pkt.Data)
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	switch pkt.Kind {
	case drpcwire.KindInvoke:
		err := drpc.ProtocolError.New("invoke on existing stream")
		s.terminate(err)
		return err

	case drpcwire.KindError:
		err := drpcwire.UnmarshalError(pkt.Data)
		s.sigs.send.Set(io.EOF) // in this state, gRPC returns io.EOF on send.
		s.terminate(err)
		return nil

	case drpcwire.KindClose:
		s.sigs.recv.Set(io.EOF)
		s.pbuf.Close(io.EOF)
		s.terminate(drpc.ClosedError.New("remote closed the stream"))
		return nil

	case drpcwire.KindCloseSend:
		s.sigs.recv.Set(io.EOF)
		s.pbuf.Close(io.EOF)
		s.terminateIfBothClosed()
		return nil

	default:
		err := drpc.InternalError.New("unknown packet kind: %s", pkt.Kind)
		s.terminate(err)
		return err
	}
}

//
// helpers
//

// checkFinished checks to see if the stream is terminated, and if so, sets the finished
// flag. This must be called after every read or write is complete, as well as when
// the stream becomes terminated.
func (s *Stream) checkFinished() {
	if s.sigs.term.IsSet() && s.write.Unlocked() && s.read.Unlocked() {
		if s.sigs.fin.Set(nil) {
			s.ctx.sig.Set(context.Canceled)
		}
	}
}

// checkCancelError will replace the error with one from the cancel signal if it is
// set. This is to prevent errors from reads/writes to a transport after it has been
// asynchronously closed due to context cancelation.
func (s *Stream) checkCancelError(err error) error {
	if s.sigs.cancel.IsSet() {
		return s.sigs.cancel.Err()
	}
	return err
}

// newFrame bumps the internal message id and returns a frame. It must be called
// under a mutex.
func (s *Stream) newFrame(kind drpcwire.Kind) drpcwire.Frame {
	s.id.Message++
	return drpcwire.Frame{ID: s.id, Kind: kind}
}

// sendPacket sends the packet in a single write and flushes. It does not check for
// any conditions to stop it from writing and is meant for internal stream use to
// do things like signal errors or closes to the remote side.
func (s *Stream) sendPacket(kind drpcwire.Kind, data []byte) (err error) {
	fr := s.newFrame(kind)
	fr.Data = data
	fr.Done = true

	s.log("SEND", fr.String)

	if err := s.wr.WriteFrame(fr); err != nil {
		return errs.Wrap(err)
	}
	if err := s.wr.Flush(); err != nil {
		return errs.Wrap(err)
	}
	return nil
}

// terminateIfBothClosed is a helper to terminate the stream if both sides have
// issued a CloseSend.
func (s *Stream) terminateIfBothClosed() {
	if s.sigs.send.IsSet() && s.sigs.recv.IsSet() {
		s.terminate(termBothClosed)
	}
}

// terminate marks the stream as terminated with the given error. It also marks
// the stream as finished if no writes are happening at the time of the call.
func (s *Stream) terminate(err error) {
	s.sigs.send.Set(err)
	s.sigs.recv.Set(err)
	if s.sigs.term.Set(err) && s.term != nil {
		s.term <- struct{}{}
	}
	s.pbuf.Close(err)
	s.checkFinished()
}

//
// raw read/write
//

// RawWrite sends the data bytes with the given kind.
func (s *Stream) RawWrite(kind drpcwire.Kind, data []byte) (err error) {
	defer s.checkFinished()
	s.write.Lock()
	defer s.write.Unlock()

	return s.rawWriteLocked(kind, data)
}

// rawWriteLocked does the body of RawWrite assuming the caller is holding the
// appropriate locks.
func (s *Stream) rawWriteLocked(kind drpcwire.Kind, data []byte) (err error) {
	fr := s.newFrame(kind)
	n := s.opts.SplitSize

	for {
		switch {
		case s.sigs.send.IsSet():
			return s.sigs.send.Err()
		case s.sigs.term.IsSet():
			return s.sigs.term.Err()
		}

		fr.Data, data = drpcwire.SplitData(data, n)
		fr.Done = len(data) == 0

		s.log("SEND", fr.String)

		if err := s.wr.WriteFrame(fr); err != nil {
			return s.checkCancelError(errs.Wrap(err))
		} else if fr.Done {
			return nil
		}
	}
}

// RawFlush flushes any buffers of data.
func (s *Stream) RawFlush() (err error) {
	defer s.checkFinished()
	s.write.Lock()
	defer s.write.Unlock()

	return s.rawFlushLocked()
}

// rawFlushLocked checks for any conditions that should cause a flush to not happen
// and then issues the flush. It assumes the caller is holding the appropriate locks.
func (s *Stream) rawFlushLocked() (err error) {
	if s.wr.Empty() {
		return nil
	}

	switch {
	case s.sigs.send.IsSet():
		return s.sigs.send.Err()
	case s.sigs.term.IsSet():
		return s.sigs.term.Err()
	}

	return s.checkCancelError(errs.Wrap(s.wr.Flush()))
}

// RawRecv returns the raw bytes received for a message.
func (s *Stream) RawRecv() (data []byte, err error) {
	data, err = s.rawRecv()
	if err != nil {
		return nil, err
	}
	data = append([]byte(nil), data...)
	s.pbuf.Done()
	return data, nil
}

// rawRecv returns the raw bytes received for a message. It does not make a
// copy of the bytes and so care must be taken to signal when HandlePacket
// is allowed to return.
func (s *Stream) rawRecv() (data []byte, err error) {
	if s.opts.ManualFlush && !s.wr.Empty() {
		if err := s.RawFlush(); err != nil {
			return nil, err
		}
	}

	defer s.checkFinished()
	s.read.Lock()
	defer s.read.Unlock()

	return s.pbuf.Get()
}

//
// msg read/write
//

// MsgSend marshals the message with the encoding, writes it, and flushes.
func (s *Stream) MsgSend(msg drpc.Message, enc drpc.Encoding) (err error) {
	defer s.checkFinished()
	s.write.Lock()
	defer s.write.Unlock()

	wbuf, err := drpcenc.MarshalAppend(msg, enc, s.wbuf[:0])
	if err != nil {
		return errs.Wrap(err)
	}
	if s.opts.MaximumBufferSize == 0 || len(wbuf) < s.opts.MaximumBufferSize {
		s.wbuf = wbuf
	}
	if err := s.rawWriteLocked(drpcwire.KindMessage, wbuf); err != nil {
		return err
	}
	if !s.opts.ManualFlush {
		if err := s.rawFlushLocked(); err != nil {
			return err
		}
	}

	return nil
}

// MsgRecv recives some message data and unmarshals it with enc into msg.
func (s *Stream) MsgRecv(msg drpc.Message, enc drpc.Encoding) (err error) {
	data, err := s.rawRecv()
	if err != nil {
		return err
	}
	err = enc.Unmarshal(data, msg)
	s.pbuf.Done()
	return err
}

//
// terminal messages
//

var (
	sendClosed     = drpc.Error.New("send closed")
	termError      = drpc.Error.New("stream terminated by sending error")
	termClosed     = drpc.Error.New("stream terminated by sending close")
	termBothClosed = drpc.Error.New("stream terminated by both issuing close send")
)

// SendError terminates the stream and sends the error to the remote. It is a no-op if
// the stream is already terminated.
func (s *Stream) SendError(serr error) (err error) {
	s.log("CALL", func() string { return fmt.Sprintf("SendError(%v)", serr) })

	s.mu.Lock()
	if s.sigs.term.IsSet() {
		s.mu.Unlock()
		return nil
	}

	defer s.checkFinished()
	s.write.Lock()
	defer s.write.Unlock()

	s.sigs.send.Set(io.EOF) // in this state, gRPC returns io.EOF on send.
	s.terminate(termError)
	s.mu.Unlock()

	return s.checkCancelError(s.sendPacket(drpcwire.KindError, drpcwire.MarshalError(serr)))
}

// Close terminates the stream and sends that the stream has been closed to the remote.
// It is a no-op if the stream is already terminated.
func (s *Stream) Close() (err error) {
	s.log("CALL", func() string { return "Close()" })

	s.mu.Lock()
	if s.sigs.term.IsSet() {
		s.mu.Unlock()
		return nil
	}

	defer s.checkFinished()
	s.write.Lock()
	defer s.write.Unlock()

	s.terminate(termClosed)
	s.mu.Unlock()

	return s.checkCancelError(s.sendPacket(drpcwire.KindClose, nil))
}

// CloseSend informs the remote that no more messages will be sent. If the remote has
// also already issued a CloseSend, the stream is terminated. It is a no-op if the
// stream already has sent a CloseSend or if it is terminated.
func (s *Stream) CloseSend() (err error) {
	s.log("CALL", func() string { return "CloseSend()" })

	s.mu.Lock()
	if s.sigs.send.IsSet() || s.sigs.term.IsSet() {
		s.mu.Unlock()
		return nil
	}

	defer s.checkFinished()
	s.write.Lock()
	defer s.write.Unlock()

	s.sigs.send.Set(sendClosed)
	s.terminateIfBothClosed()
	s.mu.Unlock()

	return s.checkCancelError(s.sendPacket(drpcwire.KindCloseSend, nil))
}

// Cancel transitions the stream into a state where all writes to the transport will return
// the provided error, and terminates the stream. It is a no-op if the stream is already
// terminated.
func (s *Stream) Cancel(err error) {
	s.log("CALL", func() string { return fmt.Sprintf("Cancel(%v)", err) })

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.sigs.term.IsSet() && s.write.Unlocked() && s.read.Unlocked() {
		return
	}

	s.sigs.cancel.Set(err)
	s.sigs.send.Set(io.EOF) // in this state, gRPC returns io.EOF on send.
	s.terminate(err)
}
