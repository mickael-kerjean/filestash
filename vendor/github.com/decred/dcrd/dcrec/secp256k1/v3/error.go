// Copyright (c) 2020 The Decred developers
// Use of this source code is governed by an ISC
// license that can be found in the LICENSE file.

package secp256k1

import (
	"fmt"
)

// ErrorCode identifies a kind of pubkey-related error.  It has full support for
// errors.Is and errors.As, so the caller can directly check against an error
// code when determining the reason for an error.
type ErrorCode int

// These constants are used to identify a specific RuleError.
const (
	// ErrPubKeyInvalidLen indicates that the length of a serialized public
	// key is not one of the allowed lengths.
	ErrPubKeyInvalidLen ErrorCode = iota

	// ErrPubKeyInvalidFormat indicates an attempt was made to parse a public
	// key that does not specify one of the supported formats.
	ErrPubKeyInvalidFormat

	// ErrPubKeyXTooBig indicates that the x coordinate for a public key
	// is greater than or equal to the prime of the field underlying the group.
	ErrPubKeyXTooBig

	// ErrPubKeyYTooBig indicates that the y coordinate for a public key is
	// greater than or equal to the prime of the field underlying the group.
	ErrPubKeyYTooBig

	// ErrPubKeyNotOnCurve indicates that a public key is not a point on the
	// secp256k1 curve.
	ErrPubKeyNotOnCurve

	// ErrPubKeyMismatchedOddness indicates that a hybrid public key specified
	// an oddness of the y coordinate that does not match the actual oddness of
	// the provided y coordinate.
	ErrPubKeyMismatchedOddness

	// numErrorCodes is the maximum error code number used in tests.  This entry
	// MUST be the last entry in the enum.
	numErrorCodes
)

// Map of ErrorCode values back to their constant names for pretty printing.
var errorCodeStrings = map[ErrorCode]string{
	ErrPubKeyInvalidLen:        "ErrPubKeyInvalidLen",
	ErrPubKeyXTooBig:           "ErrPubKeyXTooBig",
	ErrPubKeyYTooBig:           "ErrPubKeyYTooBig",
	ErrPubKeyNotOnCurve:        "ErrPubKeyNotOnCurve",
	ErrPubKeyMismatchedOddness: "ErrPubKeyMismatchedOddness",
	ErrPubKeyInvalidFormat:     "ErrPubKeyInvalidFormat",
}

// String returns the ErrorCode as a human-readable name.
func (e ErrorCode) String() string {
	if s := errorCodeStrings[e]; s != "" {
		return s
	}
	return fmt.Sprintf("Unknown ErrorCode (%d)", int(e))
}

// Error implements the error interface.
func (e ErrorCode) Error() string {
	return e.String()
}

// Is implements the interface to work with the standard library's errors.Is.
//
// It returns true in the following cases:
// - The target is a Error and the error codes match
// - The target is a ErrorCode and the error codes match
func (e ErrorCode) Is(target error) bool {
	switch target := target.(type) {
	case Error:
		return e == target.ErrorCode

	case ErrorCode:
		return e == target
	}

	return false
}

// Error identifies a pubkey-related error.  It has full support for errors.Is
// and errors.As, so the caller can ascertain the specific reason for the error
// by checking the underlying error code.
type Error struct {
	ErrorCode   ErrorCode // Describes the kind of error
	Description string    // Human readable description of the issue
}

// Error satisfies the error interface and prints human-readable errors.
func (e Error) Error() string {
	return e.Description
}

// Is implements the interface to work with the standard library's errors.Is.
//
// It returns true in the following cases:
// - The target is a Error and the error codes match
// - The target is a ErrorCode and it the error codes match
func (e Error) Is(target error) bool {
	switch target := target.(type) {
	case Error:
		return e.ErrorCode == target.ErrorCode

	case ErrorCode:
		return target == e.ErrorCode
	}

	return false
}

// Unwrap returns the underlying wrapped error code.
func (e Error) Unwrap() error {
	return e.ErrorCode
}

// makeError creates a Error given a set of arguments.
func makeError(c ErrorCode, desc string) Error {
	return Error{ErrorCode: c, Description: desc}
}
