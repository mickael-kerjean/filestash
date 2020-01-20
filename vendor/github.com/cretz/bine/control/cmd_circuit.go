package control

import (
	"strings"
)

// ExtendCircuit invokes EXTENDCIRCUIT and returns the circuit ID on success.
func (c *Conn) ExtendCircuit(circuitID string, path []string, purpose string) (string, error) {
	if circuitID == "" {
		circuitID = "0"
	}
	cmd := "EXTENDCIRCUIT " + circuitID
	if len(path) > 0 {
		cmd += " " + strings.Join(path, ",")
	}
	if purpose != "" {
		cmd += " purpose=" + purpose
	}
	resp, err := c.SendRequest(cmd)
	if err != nil {
		return "", err
	}
	return resp.Reply[strings.LastIndexByte(resp.Reply, ' ')+1:], nil
}

// SetCircuitPurpose invokes SETCIRCUITPURPOSE.
func (c *Conn) SetCircuitPurpose(circuitID string, purpose string) error {
	return c.sendRequestIgnoreResponse("SETCIRCUITPURPOSE %v purpose=%v", circuitID, purpose)
}

// CloseCircuit invokes CLOSECIRCUIT.
func (c *Conn) CloseCircuit(circuitID string, flags []string) error {
	cmd := "CLOSECIRCUIT " + circuitID
	for _, flag := range flags {
		cmd += " " + flag
	}
	return c.sendRequestIgnoreResponse(cmd)
}
