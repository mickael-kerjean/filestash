// Copyright 2015 Muir Manders.  All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

package goftp

import (
	"bufio"
	"crypto/tls"
	"fmt"
	"net"
	"net/textproto"
	"strconv"
	"strings"
	"time"
)

type RawConn interface {
	// Sends command fmt.Sprintf(f, args...) to the server, returning the response code,
	// response message, and error if any.
	SendCommand(f string, args ...interface{}) (int, string, error)

	// Prepares a data connection to the server. PrepareDataConn returns a getter function
	// because in active transfer mode you must first call PrepareDataConn (to tell server
	// what port to connect to), then send a control command to tell the server to initiate
	// a connection, then finally you invoke the getter function to get the actual
	// net.Conn.
	PrepareDataConn() (func() (net.Conn, error), error)

	// Read a pending response from the server. This is necessary after completing a
	// data command since the server sends an unsolicited response you must read.
	ReadResponse() (int, string, error)

	// Close the control and data connection, if open.
	Close() error
}

// Represents a single connection to an FTP server.
type persistentConn struct {
	// control socket
	controlConn net.Conn

	// data socket (tracked so we can close it on client.Close())
	dataConn net.Conn

	// control socket read/write helpers
	reader *textproto.Reader
	writer *textproto.Writer

	config Config
	t0     time.Time

	// has this connection encountered an unrecoverable error
	broken bool

	// index of this connection (used for logging context and
	// round-roubin host selection)
	idx int

	// map of ftp features available on server
	features map[string]string

	// remember EPSV support
	epsvNotSupported bool

	// tracks the current type (e.g. ASCII/Image) of connection
	currentType string

	host string
}

func (pconn *persistentConn) SendCommand(f string, args ...interface{}) (int, string, error) {
	return pconn.sendCommand(f, args...)
}

func (pconn *persistentConn) PrepareDataConn() (func() (net.Conn, error), error) {
	return pconn.prepareDataConn()
}

func (pconn *persistentConn) ReadResponse() (int, string, error) {
	return pconn.readResponse()
}

func (pconn *persistentConn) Close() error {
	return pconn.close()
}

func (pconn *persistentConn) setControlConn(conn net.Conn) {
	pconn.controlConn = conn
	pconn.reader = textproto.NewReader(bufio.NewReader(conn))
	pconn.writer = textproto.NewWriter(bufio.NewWriter(conn))
}

func (pconn *persistentConn) close() error {
	pconn.debug("closing")

	if pconn.dataConn != nil {
		// ignore "already closed" error since typically the user of dataConn will
		// close it, but we still want to make sure it's closed here
		pconn.dataConn.Close()
	}

	if pconn.controlConn != nil {
		return pconn.controlConn.Close()
	}

	return nil
}

func (pconn *persistentConn) sendCommandExpected(expected int, f string, args ...interface{}) error {
	code, msg, err := pconn.sendCommand(f, args...)
	if err != nil {
		return err
	}

	var ok bool
	switch expected {
	case replyGroupPositiveCompletion, replyGroupPreliminaryReply:
		ok = code/100 == expected
	default:
		ok = code == expected
	}

	if !ok {
		return ftpError{code: code, msg: msg}
	}

	return nil
}

func (pconn *persistentConn) sendCommand(f string, args ...interface{}) (int, string, error) {
	cmd := fmt.Sprintf(f, args...)

	logName := cmd
	if strings.HasPrefix(cmd, "PASS") {
		logName = "PASS ******"
	}

	pconn.debug("sending command %s", logName)

	if pconn.config.stubResponses != nil {
		if stub, found := pconn.config.stubResponses[cmd]; found {
			pconn.debug("got stub response %d-%s", stub.code, stub.msg)
			return stub.code, stub.msg, nil
		}
	}

	pconn.controlConn.SetWriteDeadline(time.Now().Add(pconn.config.Timeout))
	err := pconn.writer.PrintfLine("%s", cmd)

	if err != nil {
		pconn.broken = true
		pconn.debug(`error sending command "%s": %s`, logName, err)
		return 0, "", ftpError{
			err:       fmt.Errorf("error writing command: %s", err),
			temporary: true,
		}
	}

	code, msg, err := pconn.readResponse()
	if err != nil {
		return 0, "", err
	}

	pconn.debug("got %d-%s", code, msg)

	return code, msg, err
}

func (pconn *persistentConn) readResponse() (int, string, error) {
	pconn.controlConn.SetReadDeadline(time.Now().Add(pconn.config.Timeout))
	code, msg, err := pconn.reader.ReadResponse(0)
	if err != nil {
		pconn.broken = true
		pconn.debug("error reading response: %s", err)
		err = ftpError{
			err:       fmt.Errorf("error reading response: %s", err),
			temporary: true,
		}
	}
	return code, msg, err
}

func (pconn *persistentConn) debug(f string, args ...interface{}) {
	if pconn.config.Logger == nil {
		return
	}

	fmt.Fprintf(pconn.config.Logger, "goftp: %.3f #%d %s\n",
		time.Now().Sub(pconn.t0).Seconds(),
		pconn.idx,
		fmt.Sprintf(f, args...),
	)
}

func (pconn *persistentConn) fetchFeatures() error {
	code, msg, err := pconn.sendCommand("FEAT")
	if err != nil {
		return err
	}

	if !positiveCompletionReply(code) {
		pconn.debug("server doesn't support FEAT: %d-%s", code, msg)
		return nil
	}

	for _, line := range strings.Split(msg, "\n") {
		if len(line) > 0 && line[0] == ' ' {
			parts := strings.SplitN(strings.TrimSpace(line), " ", 2)
			if len(parts) == 1 {
				pconn.features[strings.ToUpper(parts[0])] = ""
			} else if len(parts) == 2 {
				pconn.features[strings.ToUpper(parts[0])] = parts[1]
			}
		}
	}

	return nil
}

func (pconn *persistentConn) hasFeature(name string) bool {
	_, found := pconn.features[name]
	return found
}

func (pconn *persistentConn) hasFeatureWithArg(name, arg string) bool {
	val, found := pconn.features[name]
	return found && strings.ToUpper(arg) == val
}

func (pconn *persistentConn) logIn() error {
	if pconn.config.User == "" {
		return nil
	}

	code, msg, err := pconn.sendCommand("USER %s", pconn.config.User)
	if err != nil {
		pconn.broken = true
		return err
	}

	if code == replyNeedPassword {
		code, msg, err = pconn.sendCommand("PASS %s", pconn.config.Password)
		if err != nil {
			return err
		}
	}

	if !positiveCompletionReply(code) {
		return ftpError{code: code, msg: msg}
	}

	if pconn.config.TLSConfig != nil && pconn.config.TLSMode == TLSImplicit {

		err = pconn.sendCommandExpected(replyGroupPositiveCompletion, "PBSZ 0")
		if err != nil {
			return err
		}

		err = pconn.sendCommandExpected(replyGroupPositiveCompletion, "PROT P")
		if err != nil {
			return err
		}
	}

	return nil
}

// Request that the server enters passive mode, allowing us to connect to it.
// This lets transfers work with the client behind NAT, so you almost always
// want it. First try EPSV, then fall back to PASV.
func (pconn *persistentConn) requestPassive() (string, error) {
	var (
		startIdx   int
		endIdx     int
		port       int
		remoteHost string
		code       int
		msg        string
		err        error
	)

	if pconn.epsvNotSupported {
		goto PASV
	}

	// Extended PaSsiVe (same idea as PASV, but works with IPv6).
	// See http://tools.ietf.org/html/rfc2428.
	code, msg, err = pconn.sendCommand("EPSV")
	if err != nil {
		return "", err
	}

	if code != replyEnteringExtendedPassiveMode {
		pconn.debug("server doesn't support EPSV: %d-%s", code, msg)
		pconn.epsvNotSupported = true
		goto PASV
	}

	startIdx = strings.Index(msg, "|||")
	endIdx = strings.LastIndex(msg, "|")
	if startIdx == -1 || endIdx == -1 || startIdx+3 > endIdx {
		pconn.debug("failed parsing EPSV response: %s", msg)
		goto PASV
	}

	port, err = strconv.Atoi(msg[startIdx+3 : endIdx])
	if err != nil {
		pconn.debug("EPSV response didn't contain port: %s", msg)
		goto PASV
	}

	remoteHost, _, err = net.SplitHostPort(pconn.controlConn.RemoteAddr().String())
	if err != nil {
		pconn.debug("failed determining remote host: %s", err)
		goto PASV
	}

	return fmt.Sprintf("[%s]:%d", remoteHost, port), nil

PASV:
	code, msg, err = pconn.sendCommand("PASV")
	if err != nil {
		return "", err
	}

	if code != replyEnteringPassiveMode {
		return "", ftpError{code: code, msg: msg}
	}

	parseError := ftpError{
		err: fmt.Errorf("error parsing PASV response (%s)", msg),
	}

	// "Entering Passive Mode (162,138,208,11,223,57)."
	startIdx = strings.Index(msg, "(")
	endIdx = strings.LastIndex(msg, ")")
	if startIdx == -1 || endIdx == -1 || startIdx > endIdx {
		return "", parseError
	}

	addrParts := strings.Split(msg[startIdx+1:endIdx], ",")
	if len(addrParts) != 6 {
		return "", parseError
	}

	ip := net.ParseIP(strings.Join(addrParts[0:4], "."))
	if ip == nil {
		return "", parseError
	}

	port = 0
	for i, part := range addrParts[4:6] {
		portOctet, err := strconv.Atoi(part)
		if err != nil {
			return "", parseError
		}
		port |= portOctet << (byte(1-i) * 8)
	}

	return net.JoinHostPort(ip.String(), strconv.Itoa(port)), nil
}

type dataConn struct {
	net.Conn
	Timeout time.Duration
}

func (c *dataConn) Read(buf []byte) (int, error) {
	c.Conn.SetReadDeadline(time.Now().Add(c.Timeout))
	return c.Conn.Read(buf)
}

func (c *dataConn) Write(buf []byte) (int, error) {
	c.Conn.SetWriteDeadline(time.Now().Add(c.Timeout))
	return c.Conn.Write(buf)
}

func (pconn *persistentConn) prepareDataConn() (func() (net.Conn, error), error) {
	if pconn.config.ActiveTransfers {
		listener, err := pconn.listenActive()
		if err != nil {
			return nil, err
		}

		return func() (net.Conn, error) {
			defer func() {
				if err := listener.Close(); err != nil {
					pconn.debug("error closing data connection listener: %s", err)
				}
			}()

			listener.SetDeadline(time.Now().Add(pconn.config.Timeout))
			dc, netErr := listener.Accept()

			if netErr != nil {
				var isTemporary bool
				if ne, ok := netErr.(net.Error); ok {
					isTemporary = ne.Temporary()
				}
				return nil, ftpError{err: netErr, temporary: isTemporary}
			}

			if pconn.config.TLSConfig != nil {
				dc = tls.Server(dc, pconn.config.TLSConfig)
				pconn.debug("upgraded active connection to TLS")
			}

			pconn.dataConn = &dataConn{
				Conn:    dc,
				Timeout: pconn.config.Timeout,
			}
			return pconn.dataConn, nil
		}, nil
	} else {
		host, err := pconn.requestPassive()
		if err != nil {
			return nil, err
		}

		pconn.debug("opening data connection to %s", host)
		dc, netErr := net.DialTimeout("tcp", host, pconn.config.Timeout)

		if netErr != nil {
			var isTemporary bool
			if ne, ok := netErr.(net.Error); ok {
				isTemporary = ne.Temporary()
			}
			return nil, ftpError{err: netErr, temporary: isTemporary}
		}

		if pconn.config.TLSConfig != nil {
			pconn.debug("upgrading data connection to TLS")
			dc = tls.Client(dc, pconn.config.TLSConfig)
		}

		return func() (net.Conn, error) {
			pconn.dataConn = &dataConn{
				Conn:    dc,
				Timeout: pconn.config.Timeout,
			}
			return pconn.dataConn, nil
		}, nil
	}
}

func (pconn *persistentConn) listenActive() (*net.TCPListener, error) {
	listenAddr := pconn.config.ActiveListenAddr

	localAddr := pconn.controlConn.LocalAddr().String()
	localHost, localPort, err := net.SplitHostPort(localAddr)
	if err != nil {
		return nil, ftpError{err: fmt.Errorf("error splitting local address: %s (%s)", err, localAddr)}
	}

	if listenAddr == ":" {
		listenAddr = localAddr
	} else if listenAddr[len(listenAddr)-1] == ':' {
		listenAddr = net.JoinHostPort(listenAddr[0:len(listenAddr)-1], localPort)
	} else if listenAddr[0] == ':' {
		listenAddr = net.JoinHostPort(localHost, listenAddr[1:])
	}

	tcpAddr, err := net.ResolveTCPAddr("tcp", listenAddr)
	if err != nil {
		return nil, ftpError{err: fmt.Errorf("error parsing active listen addr: %s (%s)", err, listenAddr)}
	}

	listener, err := net.ListenTCP("tcp", tcpAddr)
	if err != nil {
		return nil, ftpError{err: fmt.Errorf("error listening on %s for active transfer: %s", listenAddr, err)}
	}
	pconn.debug("listening on %s for active connection", listener.Addr().String())

	listenHost, listenPortStr, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		return nil, ftpError{err: fmt.Errorf("error splitting listener addr: %s (%s)", err, listener.Addr().String())}
	}

	listenPort, err := strconv.Atoi(listenPortStr)
	if err != nil {
		return nil, ftpError{err: fmt.Errorf("error parsing listen port: %s (%s)", err, listenPortStr)}
	}

	hostIP := net.ParseIP(listenHost)
	if hostIP == nil {
		return nil, ftpError{err: fmt.Errorf("failed parsing host IP %s", listenHost)}
	}

	hostIPv4 := hostIP.To4()
	if hostIPv4 == nil {
		if err := pconn.sendCommandExpected(200, "EPRT |%d|%s|%d|", 2, listenHost, listenPort); err != nil {
			return nil, err
		}
	} else {
		err := pconn.sendCommandExpected(200, "PORT %d,%d,%d,%d,%d,%d",
			hostIPv4[0], hostIPv4[1], hostIPv4[2], hostIPv4[3],
			listenPort>>8, listenPort&0xFF,
		)
		if err != nil {
			return nil, err
		}
	}

	return listener, nil
}

func (pconn *persistentConn) setType(t string) error {
	if pconn.currentType == t {
		pconn.debug("type already set to %s", t)
		return nil
	}
	err := pconn.sendCommandExpected(replyCommandOkay, "TYPE %s", t)
	if err != nil {
		pconn.currentType = t
	}
	return err
}

func (pconn *persistentConn) logInTLS() error {
	err := pconn.sendCommandExpected(replyAuthOkayNoDataNeeded, "AUTH TLS")
	if err != nil {
		return err
	}

	pconn.setControlConn(tls.Client(pconn.controlConn, pconn.config.TLSConfig))

	err = pconn.logIn()
	if err != nil {
		return err
	}

	err = pconn.sendCommandExpected(replyGroupPositiveCompletion, "PBSZ 0")
	if err != nil {
		return err
	}

	err = pconn.sendCommandExpected(replyGroupPositiveCompletion, "PROT P")
	if err != nil {
		return err
	}

	pconn.debug("successfully upgraded to TLS")

	return nil
}
