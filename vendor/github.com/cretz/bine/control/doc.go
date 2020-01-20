// Package control implements a low-level client for the Tor control spec
// version 1.
//
// The primary entrypoint is the Conn struct, instantiated with NewConn. This is
// the low-level layer to the control port of an already-running Tor instance.
// Most developers will prefer the tor package adjacent to this one for a higher
// level abstraction over the process and this connection.
//
// Some of this code is lifted from https://github.com/yawning/bulb with thanks.
package control
