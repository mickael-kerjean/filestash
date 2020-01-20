package control

import (
	"fmt"
	"net/textproto"
	"strings"
)

// The various control port StatusCode constants.
const (
	StatusOk            = 250
	StatusOkUnnecessary = 251

	StatusErrResourceExhausted      = 451
	StatusErrSyntaxError            = 500
	StatusErrUnrecognizedCmd        = 510
	StatusErrUnimplementedCmd       = 511
	StatusErrSyntaxErrorArg         = 512
	StatusErrUnrecognizedCmdArg     = 513
	StatusErrAuthenticationRequired = 514
	StatusErrBadAuthentication      = 515
	StatusErrUnspecifiedTorError    = 550
	StatusErrInternalError          = 551
	StatusErrUnrecognizedEntity     = 552
	StatusErrInvalidConfigValue     = 553
	StatusErrInvalidDescriptor      = 554
	StatusErrUnmanagedEntity        = 555

	StatusAsyncEvent = 650
)

var statusCodeStringMap = map[int]string{
	StatusOk:            "OK",
	StatusOkUnnecessary: "Operation was unnecessary",

	StatusErrResourceExhausted:      "Resource exhausted",
	StatusErrSyntaxError:            "Syntax error: protocol",
	StatusErrUnrecognizedCmd:        "Unrecognized command",
	StatusErrUnimplementedCmd:       "Unimplemented command",
	StatusErrSyntaxErrorArg:         "Syntax error in command argument",
	StatusErrUnrecognizedCmdArg:     "Unrecognized command argument",
	StatusErrAuthenticationRequired: "Authentication required",
	StatusErrBadAuthentication:      "Bad authentication",
	StatusErrUnspecifiedTorError:    "Unspecified Tor error",
	StatusErrInternalError:          "Internal error",
	StatusErrUnrecognizedEntity:     "Unrecognized entity",
	StatusErrInvalidConfigValue:     "Invalid configuration value",
	StatusErrInvalidDescriptor:      "Invalid descriptor",
	StatusErrUnmanagedEntity:        "Unmanaged entity",

	StatusAsyncEvent: "Asynchronous event notification",
}

func statusCodeToError(code int, reply string) *textproto.Error {
	err := new(textproto.Error)
	err.Code = code
	if msg, ok := statusCodeStringMap[code]; ok {
		trimmedReply := strings.TrimSpace(strings.TrimPrefix(reply, msg))
		err.Msg = fmt.Sprintf("%s: %s", msg, trimmedReply)
	} else {
		err.Msg = fmt.Sprintf("Unknown status code (%03d): %s", code, reply)
	}
	return err
}
