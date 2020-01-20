package control

import (
	"fmt"
	"io"
	"net/textproto"
	"sync"
)

// Conn is the connection to the Tor control port.
type Conn struct {
	// DebugWriter is the writer that debug logs for this library (not Tor
	// itself) will be written to. If nil, no debug logs are generated/written.
	DebugWriter io.Writer

	// This is the underlying connection.
	conn *textproto.Conn

	// This is set lazily by ProtocolInfo().
	protocolInfo *ProtocolInfo

	// True if Authenticate has been called successfully.
	Authenticated bool

	// The lock fot eventListeners
	eventListenersLock sync.RWMutex
	// The value slices can be traversed outside of lock, they are completely
	// replaced on change, never mutated. But the map itself must be locked on
	// when reading or writing.
	eventListeners map[EventCode][]chan<- Event

	// This mutex is locked on when an entire response needs to be read. It
	// helps synchronize accesses to the response by the asynchronous response
	// listeners and the synchronous responses.
	readLock sync.Mutex
}

// NewConn creates a Conn from the given textproto connection.
func NewConn(conn *textproto.Conn) *Conn {
	return &Conn{
		conn:           conn,
		eventListeners: map[EventCode][]chan<- Event{},
	}
}

func (c *Conn) sendRequestIgnoreResponse(format string, args ...interface{}) error {
	_, err := c.SendRequest(format, args...)
	return err
}

// SendRequest sends a synchronous request to Tor and awaits the response. If
// the response errors, the error result will be set, but the response will be
// set also. This is usually not directly used by callers, but instead called by
// higher-level methods.
func (c *Conn) SendRequest(format string, args ...interface{}) (*Response, error) {
	if c.debugEnabled() {
		c.debugf("Write line: %v", fmt.Sprintf(format, args...))
	}
	id, err := c.conn.Cmd(format, args...)
	if err != nil {
		return nil, err
	}
	c.readLock.Lock()
	defer c.readLock.Unlock()
	c.conn.StartResponse(id)
	defer c.conn.EndResponse(id)
	// Get the first non-async response
	var resp *Response
	for {
		if resp, err = c.ReadResponse(); err != nil || !resp.IsAsync() {
			break
		}
		c.relayAsyncEvents(resp)
	}
	if err == nil && !resp.IsOk() {
		err = resp.Err
	}
	return resp, err
}

// Close sends a QUIT and closes the underlying Tor connection. This does not
// error if the QUIT is not accepted but does relay any error that occurs while
// closing the underlying connection.
func (c *Conn) Close() error {
	// Ignore the response and ignore the error
	c.Quit()
	return c.conn.Close()
}

func (c *Conn) debugEnabled() bool {
	return c.DebugWriter != nil
}

func (c *Conn) debugf(format string, args ...interface{}) {
	if w := c.DebugWriter; w != nil {
		fmt.Fprintf(w, format+"\n", args...)
	}
}

func (*Conn) protoErr(format string, args ...interface{}) textproto.ProtocolError {
	return textproto.ProtocolError(fmt.Sprintf(format, args...))
}
