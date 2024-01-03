package nfs4

import (
	"context"
	"io"
	"net"
	"sync"
	"time"
)

// A wrapper for net.Conn that adds ability to cancel operations via a context.Context and
// also supports deadlines.
type SupervisedConnection struct {
	delegate net.Conn
	ctx      context.Context
	deadline time.Time

	mtx         sync.Mutex
	closeSignal chan bool
	closeErr    error
	isClosed    int32
}

func NewSupervisedConnection(delegate net.Conn,
	ctx context.Context) (*SupervisedConnection, error) {

	res := &SupervisedConnection{
		delegate:    delegate,
		ctx:         ctx,
		closeSignal: make(chan bool),
	}
	go func() {
		select {
		case <-ctx.Done():
			res.signalDone()
		case <-res.closeSignal:
		}
	}()

	deadline, ok := ctx.Deadline()
	if ok {
		res.deadline = deadline
		err := delegate.SetDeadline(deadline)
		if err != nil {
			return nil, err
		}
	}
	return res, nil
}

func (s *SupervisedConnection) signalDone() {
	s.mtx.Lock()
	defer s.mtx.Unlock()
	if s.isClosed != 0 {
		return
	}
	// Cancel pending operations
	s.closeErr = s.delegate.Close()
	s.isClosed = 1
}

func (s *SupervisedConnection) SetReadDeadline(t time.Time) error {
	s.mtx.Lock()
	defer s.mtx.Unlock()

	// Don't allow deadline extensions if we're getting interrupted
	if !s.deadline.IsZero() && s.deadline.Before(t) {
		return nil
	}

	return s.delegate.SetReadDeadline(t)
}

func (s *SupervisedConnection) SetWriteDeadline(t time.Time) error {
	s.mtx.Lock()
	defer s.mtx.Unlock()

	// Don't allow deadline extensions if we're getting interrupted
	if !s.deadline.IsZero() && s.deadline.Before(t) {
		return nil
	}

	return s.delegate.SetWriteDeadline(t)
}

func (s *SupervisedConnection) SetDeadline(t time.Time) error {
	s.mtx.Lock()
	defer s.mtx.Unlock()

	// Don't allow deadline extensions if we're getting interrupted
	if !s.deadline.IsZero() && s.deadline.Before(t) {
		return nil
	}

	return s.delegate.SetDeadline(t)
}

func (s *SupervisedConnection) Close() error {
	s.mtx.Lock()
	defer s.mtx.Unlock()
	if s.isClosed != 0 {
		return s.closeErr
	}

	close(s.closeSignal)
	s.isClosed = 1

	s.closeErr = s.delegate.Close()
	return s.closeErr
}

func (s *SupervisedConnection) Read(b []byte) (n int, err error) {
	// s.isClosed can only go from 0 to 1, so there's no need to do
	// synchronization here.
	if s.isClosed != 0 {
		return 0, io.EOF
	}
	return s.delegate.Read(b)
}

func (s *SupervisedConnection) Write(b []byte) (n int, err error) {
	// s.isClosed can only go from 0 to 1, so there's no need to do
	// synchronization here.
	if s.isClosed != 0 {
		return 0, io.EOF
	}
	return s.delegate.Write(b)
}

func (s *SupervisedConnection) LocalAddr() net.Addr {
	return s.delegate.LocalAddr()
}

func (s *SupervisedConnection) RemoteAddr() net.Addr {
	return s.delegate.RemoteAddr()
}
