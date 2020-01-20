package control

import (
	"strconv"
)

// AttachStream invokes ATTACHSTREAM.
func (c *Conn) AttachStream(streamID string, circuitID string, hopNum int) error {
	if circuitID == "" {
		circuitID = "0"
	}
	cmd := "ATTACHSTREAM " + streamID + " " + circuitID
	if hopNum > 0 {
		cmd += " HOP=" + strconv.Itoa(hopNum)
	}
	return c.sendRequestIgnoreResponse(cmd)
}

// RedirectStream invokes REDIRECTSTREAM.
func (c *Conn) RedirectStream(streamID string, address string, port int) error {
	cmd := "REDIRECTSTREAM " + streamID + " " + address
	if port > 0 {
		cmd += " " + strconv.Itoa(port)
	}
	return c.sendRequestIgnoreResponse(cmd)
}

// CloseStream invokes CLOSESTREAM.
func (c *Conn) CloseStream(streamID string, reason string) error {
	return c.sendRequestIgnoreResponse("CLOSESTREAM %v %v", streamID, reason)
}
