package control

import (
	"strings"

	"github.com/cretz/bine/torutil"
)

// SetConf invokes SETCONF.
func (c *Conn) SetConf(entries ...*KeyVal) error {
	return c.sendSetConf("SETCONF", entries)
}

// ResetConf invokes RESETCONF.
func (c *Conn) ResetConf(entries ...*KeyVal) error {
	return c.sendSetConf("RESETCONF", entries)
}

func (c *Conn) sendSetConf(cmd string, entries []*KeyVal) error {
	for _, entry := range entries {
		cmd += " " + entry.Key
		if entry.ValSet() {
			cmd += "=" + torutil.EscapeSimpleQuotedStringIfNeeded(entry.Val)
		}
	}
	return c.sendRequestIgnoreResponse(cmd)
}

// GetConf invokes GETCONF and returns the values for the requested keys.
func (c *Conn) GetConf(keys ...string) ([]*KeyVal, error) {
	resp, err := c.SendRequest("GETCONF %v", strings.Join(keys, " "))
	if err != nil {
		return nil, err
	}
	data := resp.DataWithReply()
	ret := make([]*KeyVal, 0, len(data))
	for _, data := range data {
		key, val, ok := torutil.PartitionString(data, '=')
		entry := &KeyVal{Key: key}
		if ok {
			if entry.Val, err = torutil.UnescapeSimpleQuotedStringIfNeeded(val); err != nil {
				return nil, err
			}
			if len(entry.Val) == 0 {
				entry.ValSetAndEmpty = true
			}
		}
		ret = append(ret, entry)
	}
	return ret, nil
}

// SaveConf invokes SAVECONF.
func (c *Conn) SaveConf(force bool) error {
	cmd := "SAVECONF"
	if force {
		cmd += " FORCE"
	}
	return c.sendRequestIgnoreResponse(cmd)
}

// LoadConf invokes LOADCONF.
func (c *Conn) LoadConf(conf string) error {
	return c.sendRequestIgnoreResponse("+LOADCONF\r\n%v\r\n.", conf)
}
