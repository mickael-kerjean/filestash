// Copyright 2015 Muir Manders.  All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

package goftp

import (
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net"
	"sync"
	"time"
)

// Error is an expanded error interface returned by all Client methods.
// It allows discerning callers to discover potentially actionable qualities
// of the error.
type Error interface {
	error

	// Whether the error was transient and attempting the same operation
	// again may be succesful. This includes timeouts.
	Temporary() bool

	// If the error originated from an unexpected response from the server, this
	// will return the FTP response code. Otherwise it will return 0.
	Code() int

	// Similarly, this will return the text response from the server, or empty
	// string.
	Message() string
}

type ftpError struct {
	err       error
	code      int
	msg       string
	timeout   bool
	temporary bool
}

func (e ftpError) Error() string {
	if e.err != nil {
		return e.err.Error()
	} else {
		return fmt.Sprintf("unexpected response: %d-%s", e.code, e.msg)
	}
}

func (e ftpError) Temporary() bool {
	return e.temporary || transientNegativeCompletionReply(e.code)
}

func (e ftpError) Timeout() bool {
	return e.timeout
}

func (e ftpError) Code() int {
	if fe, _ := e.err.(Error); fe != nil {
		return fe.Code()
	}
	return e.code
}

func (e ftpError) Message() string {
	if fe, _ := e.err.(Error); fe != nil {
		return fe.Message()
	}
	return e.msg
}

// TLSMode represents the FTPS connection strategy. Servers cannot support
// both modes on the same port.
type TLSMode int

const (
	// TLSExplicit means the client first runs an explicit command ("AUTH TLS")
	// before switching to TLS.
	TLSExplicit TLSMode = 0

	// TLSImplicit means both sides already implicitly agree to use TLS, and the
	// client connects directly using TLS.
	TLSImplicit TLSMode = 1
)

// for testing
type stubResponse struct {
	code int
	msg  string
}

// Config contains configuration for a Client object.
type Config struct {
	// User name. Defaults to "anonymous".
	User string

	// User password. Defaults to "anonymous" if required.
	Password string

	// Maximum number of FTP connections to open per-host. Defaults to 5. Keep in
	// mind that FTP servers typically limit how many connections a single user
	// may have open at once, so you may need to lower this if you are doing
	// concurrent transfers.
	ConnectionsPerHost int

	// Timeout for opening connections, sending control commands, and each read/write
	// of data transfers. Defaults to 5 seconds.
	Timeout time.Duration

	// TLS Config used for FTPS. If provided, it will be an error if the server
	// does not support TLS. Both the control and data connection will use TLS.
	TLSConfig *tls.Config

	// FTPS mode. TLSExplicit means connect non-TLS, then upgrade connection to
	// TLS via "AUTH TLS" command. TLSImplicit means open the connection using
	// TLS. Defaults to TLSExplicit.
	TLSMode TLSMode

	// This flag controls whether to use IPv6 addresses found when resolving
	// hostnames. Defaults to false to prevent failures when your computer can't
	// IPv6. If the hostname(s) only resolve to IPv6 addresses, Dial() will still
	// try to use them as a last ditch effort. You can still directly give an
	// IPv6 address to Dial() even with this flag off.
	IPv6Lookup bool

	// Logging destination for debugging messages. Set to os.Stderr to log to stderr.
	// Password value will not be logged.
	Logger io.Writer

	// Time zone of the FTP server. Used when parsing mtime from "LIST" output if
	// server does not support "MLST"/"MLSD". Defaults to UTC.
	ServerLocation *time.Location

	// Enable "active" FTP data connections where the server connects to the client to
	// establish data connections (does not work if client is behind NAT). If TLSConfig
	// is specified, it will be used when listening for active connections.
	ActiveTransfers bool

	// Set the host:port to listen on for active data connections. If the host and/or
	// port is empty, the local address/port of the control connection will be used. A
	// port of 0 will listen on a random port. If not specified, the default behavior is
	// ":0", i.e. listen on the local control connection host and a random port.
	ActiveListenAddr string

	// Disables EPSV in favour of PASV. This is useful in cases where EPSV connections
	// neither complete nor downgrade to PASV successfully by themselves, resulting in
	// hung connections.
	DisableEPSV bool

	// For testing convenience.
	stubResponses map[string]stubResponse
}

// Client maintains a connection pool to the FTP server(s), so you typically only
// need one Client object. Client methods are safe to call concurrently from
// different goroutines, but once you are using all ConnectionsPerHost connections
// per host, methods will block waiting for a free connection.
type Client struct {
	config          Config
	hosts           []string
	freeConnCh      chan *persistentConn
	numConnsPerHost map[string]int
	allCons         map[int]*persistentConn
	connIdx         int
	rawConnIdx      int
	mu              sync.Mutex
	t0              time.Time
	closed          bool
}

// Construct and return a new client Conn, setting default config
// values as necessary.
func newClient(config Config, hosts []string) *Client {

	if config.ConnectionsPerHost <= 0 {
		config.ConnectionsPerHost = 5
	}

	if config.Timeout <= 0 {
		config.Timeout = 5 * time.Second
	}

	if config.User == "" {
		config.User = "anonymous"
	}

	if config.Password == "" {
		config.Password = "anonymous"
	}

	if config.ServerLocation == nil {
		config.ServerLocation = time.UTC
	}

	if config.ActiveListenAddr == "" {
		config.ActiveListenAddr = ":0"
	}

	return &Client{
		config:          config,
		freeConnCh:      make(chan *persistentConn, len(hosts)*config.ConnectionsPerHost),
		t0:              time.Now(),
		hosts:           hosts,
		allCons:         make(map[int]*persistentConn),
		numConnsPerHost: make(map[string]int),
	}
}

// Close closes all open server connections. Currently this does not attempt
// to do any kind of polite FTP connection termination. It will interrupt
// all transfers in progress.
func (c *Client) Close() error {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return ftpError{err: errors.New("already closed")}
	}
	c.closed = true

	var conns []*persistentConn
	for _, conn := range c.allCons {
		conns = append(conns, conn)
	}
	c.mu.Unlock()

	for _, pconn := range conns {
		c.removeConn(pconn)
	}

	return nil
}

// Log a debug message in the context of the client (i.e. not for a
// particular connection).
func (c *Client) debug(f string, args ...interface{}) {
	if c.config.Logger == nil {
		return
	}

	fmt.Fprintf(c.config.Logger, "goftp: %.3f %s\n",
		time.Now().Sub(c.t0).Seconds(),
		fmt.Sprintf(f, args...),
	)
}

func (c *Client) numOpenConns() int {
	var numOpen int
	for _, num := range c.numConnsPerHost {
		numOpen += int(num)
	}
	return numOpen
}

// Get an idle connection.
func (c *Client) getIdleConn() (*persistentConn, error) {

	// First check for available connections in the channel.
Loop:
	for {
		select {
		case pconn := <-c.freeConnCh:
			if pconn.broken {
				c.debug("#%d was ready (broken)", pconn.idx)
				c.mu.Lock()
				c.numConnsPerHost[pconn.host]--
				c.mu.Unlock()
				c.removeConn(pconn)
			} else {
				c.debug("#%d was ready", pconn.idx)
				return pconn, nil
			}
		default:
			break Loop
		}
	}

	// No available connections. Loop until we can open a new one, or
	// one becomes available.
	for {
		c.mu.Lock()

		// can we open a connection to some host
		if c.numOpenConns() < len(c.hosts)*c.config.ConnectionsPerHost {
			c.connIdx++
			idx := c.connIdx

			// find the next host with less than ConnectionsPerHost connections
			var host string
			for i := idx; i < idx+len(c.hosts); i++ {
				if c.numConnsPerHost[c.hosts[i%len(c.hosts)]] < c.config.ConnectionsPerHost {
					host = c.hosts[i%len(c.hosts)]
					break
				}
			}

			if host == "" {
				panic("this shouldn't be possible")
			}

			c.numConnsPerHost[host]++

			c.mu.Unlock()

			pconn, err := c.openConn(idx, host)
			if err != nil {
				c.mu.Lock()
				c.numConnsPerHost[host]--
				c.mu.Unlock()
				c.debug("#%d error connecting: %s", idx, err)
			}
			return pconn, err
		}

		c.mu.Unlock()

		// block waiting for a free connection
		pconn := <-c.freeConnCh

		if pconn.broken {
			c.debug("waited and got #%d (broken)", pconn.idx)
			c.mu.Lock()
			c.numConnsPerHost[pconn.host]--
			c.mu.Unlock()
			c.removeConn(pconn)
		} else {
			c.debug("waited and got #%d", pconn.idx)
			return pconn, nil

		}
	}
}

func (c *Client) removeConn(pconn *persistentConn) {
	c.mu.Lock()
	delete(c.allCons, pconn.idx)
	c.mu.Unlock()
	pconn.close()
}

func (c *Client) returnConn(pconn *persistentConn) {
	c.freeConnCh <- pconn
}

// OpenRawConn opens a "raw" connection to the server which allows you to run any control
// or data command you want. See the RawConn interface for more details. The RawConn will
// not participate in the Client's pool (i.e. does not count against ConnectionsPerHost).
func (c *Client) OpenRawConn() (RawConn, error) {
	c.mu.Lock()
	idx := c.rawConnIdx
	host := c.hosts[idx%len(c.hosts)]
	c.rawConnIdx++
	c.mu.Unlock()
	return c.openConn(-(idx + 1), host)
}

// Open and set up a control connection.
func (c *Client) openConn(idx int, host string) (pconn *persistentConn, err error) {
	pconn = &persistentConn{
		idx:              idx,
		features:         make(map[string]string),
		config:           c.config,
		t0:               c.t0,
		currentType:      "A",
		host:             host,
		epsvNotSupported: c.config.DisableEPSV,
	}

	var conn net.Conn

	if c.config.TLSConfig != nil && c.config.TLSMode == TLSImplicit {
		pconn.debug("opening TLS control connection to %s", host)
		dialer := &net.Dialer{
			Timeout: c.config.Timeout,
		}
		conn, err = tls.DialWithDialer(dialer, "tcp", host, pconn.config.TLSConfig)
	} else {
		pconn.debug("opening control connection to %s", host)
		conn, err = net.DialTimeout("tcp", host, c.config.Timeout)
	}

	var (
		code int
		msg  string
	)

	if err != nil {
		var isTemporary bool
		if ne, ok := err.(net.Error); ok {
			isTemporary = ne.Temporary()
		}
		err = ftpError{
			err:       err,
			temporary: isTemporary,
		}
		goto Error
	}

	pconn.setControlConn(conn)

	code, msg, err = pconn.readResponse()
	if err != nil {
		goto Error
	}

	if code != replyServiceReady {
		err = ftpError{code: code, msg: msg}
		goto Error
	}

	if c.config.TLSConfig != nil && c.config.TLSMode == TLSExplicit {
		err = pconn.logInTLS()
	} else {
		err = pconn.logIn()
	}

	if err != nil {
		goto Error
	}

	if err = pconn.fetchFeatures(); err != nil {
		goto Error
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	if c.closed {
		err = ftpError{err: errors.New("client closed")}
		goto Error
	}

	if idx >= 0 {
		c.allCons[idx] = pconn
	}
	return pconn, nil

Error:
	pconn.close()
	return nil, err
}
