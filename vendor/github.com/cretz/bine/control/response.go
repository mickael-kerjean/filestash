package control

import (
	"net/textproto"
	"strconv"
	"strings"
)

// Response is a response to a control port command or an asynchronous event.
type Response struct {
	// Err is the status code and string representation associated with a
	// response. Responses that have completed successfully will also have Err
	// set to indicate such.
	Err *textproto.Error

	// Reply is the text on the EndReplyLine of the response.
	Reply string

	// Data is the MidReplyLines/DataReplyLines of the response. Dot encoded
	// data is "decoded" and presented as a single string (terminal ".CRLF"
	// removed, all intervening CRs stripped).
	Data []string

	// RawLines is all of the lines of a response, without CRLFs.
	RawLines []string
}

// IsOk returns true if the response status code indicates success or an
// asynchronous event.
func (r *Response) IsOk() bool {
	switch r.Err.Code {
	case StatusOk, StatusOkUnnecessary, StatusAsyncEvent:
		return true
	default:
		return false
	}
}

// DataWithReply returns a combination of Data and Reply to give a full set of
// the lines of the response.
func (r *Response) DataWithReply() []string {
	ret := make([]string, len(r.Data)+1)
	copy(ret, r.Data)
	ret[len(ret)-1] = r.Reply
	return ret
}

// IsAsync returns true if the response is an asynchronous event.
func (r *Response) IsAsync() bool {
	return r.Err.Code == StatusAsyncEvent
}

// ReadResponse returns the next response object.
func (c *Conn) ReadResponse() (*Response, error) {
	var resp *Response
	var statusCode int
	for {
		line, err := c.conn.ReadLine()
		if err != nil {
			return nil, err
		}
		c.debugf("Read line: %v", line)

		// Parse the line that was just read.
		if len(line) < 4 {
			return nil, c.protoErr("Truncated response: %v", line)
		}
		if code, err := strconv.Atoi(line[0:3]); err != nil || code < 100 {
			return nil, c.protoErr("Invalid status code: %v", line[0:3])
		} else if resp == nil {
			resp = &Response{}
			statusCode = code
		} else if code != statusCode {
			// The status code should stay fixed for all lines of the response, since events can't be interleaved with
			// response lines.
			return nil, c.protoErr("Status code changed: %v != %v", code, statusCode)
		}
		resp.RawLines = append(resp.RawLines, line)
		switch line[3] {
		case ' ':
			// Final line in the response.
			resp.Reply = line[4:]
			resp.Err = statusCodeToError(statusCode, resp.Reply)
			return resp, nil
		case '-':
			// Continuation, keep reading.
			resp.Data = append(resp.Data, line[4:])
		case '+':
			// A "dot-encoded" payload follows.
			dotBody, err := c.conn.ReadDotBytes()
			if err != nil {
				return nil, err
			}
			dotBodyStr := strings.TrimRight(string(dotBody), "\n\r")
			// c.debugf("Read dot body:\n---\n%v\n---", dotBodyStr)
			resp.Data = append(resp.Data, line[4:]+"\r\n"+dotBodyStr)
			dotLines := strings.Split(dotBodyStr, "\n")
			for _, dotLine := range dotLines[:len(dotLines)-1] {
				resp.RawLines = append(resp.RawLines, dotLine)
			}
			resp.RawLines = append(resp.RawLines, ".")
		default:
			return nil, c.protoErr("Invalid separator: '%v'", line[3])
		}
	}
}
