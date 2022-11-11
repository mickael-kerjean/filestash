// Copyright 2013, Jonas mg
// All rights reserved.
//
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file.

// Package crypt provides interface for password crypt functions and collects
// common constants.
package crypt

import (
	"errors"
	"strings"

	"github.com/tredoe/osutil/user/crypt/common"
)

var ErrKeyMismatch = errors.New("hashed value is not the hash of the given password")

// Crypter is the common interface implemented by all crypt functions.
type Crypter interface {
	// Generate performs the hashing algorithm, returning a full hash suitable
	// for storage and later password verification.
	//
	// If the salt is empty, a randomly-generated salt will be generated with a
	// length of SaltLenMax and number RoundsDefault of rounds.
	//
	// Any error only can be got when the salt argument is not empty.
	Generate(key, salt []byte) (string, error)

	// Verify compares a hashed key with its possible key equivalent.
	// Returns nil on success, or an error on failure; if the hashed key is
	// diffrent, the error is "ErrKeyMismatch".
	Verify(hashedKey string, key []byte) error

	// Cost returns the hashing cost (in rounds) used to create the given hashed
	// key.
	//
	// When, in the future, the hashing cost of a key needs to be increased in
	// order to adjust for greater computational power, this function allows one
	// to establish which keys need to be updated.
	//
	// The algorithms based in MD5-crypt use a fixed value of rounds.
	Cost(hashedKey string) (int, error)

	// SetSalt sets a different salt. It is used to easily create derivated
	// algorithms, i.e. "apr1_crypt" from "md5_crypt".
	SetSalt(salt common.Salt)
}

// Crypt identifies a crypt function that is implemented in another package.
type Crypt uint

const (
	APR1   Crypt = iota + 1 // import "github.com/tredoe/osutil/user/crypt/apr1_crypt"
	MD5                     // import "github.com/tredoe/osutil/user/crypt/md5_crypt"
	SHA256                  // import "github.com/tredoe/osutil/user/crypt/sha256_crypt"
	SHA512                  // import "github.com/tredoe/osutil/user/crypt/sha512_crypt"
	maxCrypt
)

var cryptPrefixes = make([]string, maxCrypt)

var crypts = make([]func() Crypter, maxCrypt)

// RegisterCrypt registers a function that returns a new instance of the given
// crypt function. This is intended to be called from the init function in
// packages that implement crypt functions.
func RegisterCrypt(c Crypt, f func() Crypter, prefix string) {
	if c >= maxCrypt {
		panic("crypt: RegisterHash of unknown crypt function")
	}
	crypts[c] = f
	cryptPrefixes[c] = prefix
}

// New returns a new crypter.
func New(c Crypt) Crypter {
	f := crypts[c]
	if f != nil {
		return f()
	}
	panic("crypt: requested crypt function is unavailable")
}

// NewFromHash returns a new Crypter using the prefix in the given hashed key.
func NewFromHash(hashedKey string) Crypter {
	var f func() Crypter

	if strings.HasPrefix(hashedKey, cryptPrefixes[SHA512]) {
		f = crypts[SHA512]
	} else if strings.HasPrefix(hashedKey, cryptPrefixes[SHA256]) {
		f = crypts[SHA256]
	} else if strings.HasPrefix(hashedKey, cryptPrefixes[MD5]) {
		f = crypts[MD5]
	} else if strings.HasPrefix(hashedKey, cryptPrefixes[APR1]) {
		f = crypts[APR1]
	} else {
		toks := strings.SplitN(hashedKey, "$", 3)
		prefix := "$" + toks[1] + "$"
		panic("crypt: unknown cryp function from prefix: " + prefix)
	}

	if f != nil {
		return f()
	}
	panic("crypt: requested cryp function is unavailable")
}
