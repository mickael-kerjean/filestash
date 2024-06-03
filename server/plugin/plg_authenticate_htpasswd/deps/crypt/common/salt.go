// Copyright 2012, Jeramey Crawford <jeramey@antihe.ro>
// Copyright 2013, Jonas mg
// All rights reserved.
//
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file.

package common

import (
	"crypto/rand"
	"errors"
	"strconv"
)

var (
	ErrSaltPrefix = errors.New("invalid magic prefix")
	ErrSaltFormat = errors.New("invalid salt format")
	ErrSaltRounds = errors.New("invalid rounds")
)

// Salt represents a salt.
type Salt struct {
	MagicPrefix []byte

	SaltLenMin int
	SaltLenMax int

	RoundsMin     int
	RoundsMax     int
	RoundsDefault int
}

// Generate generates a random salt of a given length.
//
// The length is set thus:
//
//   length > SaltLenMax: length = SaltLenMax
//   length < SaltLenMin: length = SaltLenMin
func (s *Salt) Generate(length int) []byte {
	if length > s.SaltLenMax {
		length = s.SaltLenMax
	} else if length < s.SaltLenMin {
		length = s.SaltLenMin
	}

	saltLen := (length * 6 / 8)
	if (length*6)%8 != 0 {
		saltLen++
	}
	salt := make([]byte, saltLen)
	rand.Read(salt)

	out := make([]byte, len(s.MagicPrefix)+length)
	copy(out, s.MagicPrefix)
	copy(out[len(s.MagicPrefix):], Base64_24Bit(salt))
	return out
}

// GenerateWRounds creates a random salt with the random bytes being of the
// length provided, and the rounds parameter set as specified.
//
// The parameters are set thus:
//
//   length > SaltLenMax: length = SaltLenMax
//   length < SaltLenMin: length = SaltLenMin
//
//   rounds < 0: rounds = RoundsDefault
//   rounds < RoundsMin: rounds = RoundsMin
//   rounds > RoundsMax: rounds = RoundsMax
//
// If rounds is equal to RoundsDefault, then the "rounds=" part of the salt is
// removed.
func (s *Salt) GenerateWRounds(length, rounds int) []byte {
	if length > s.SaltLenMax {
		length = s.SaltLenMax
	} else if length < s.SaltLenMin {
		length = s.SaltLenMin
	}
	if rounds < 0 {
		rounds = s.RoundsDefault
	} else if rounds < s.RoundsMin {
		rounds = s.RoundsMin
	} else if rounds > s.RoundsMax {
		rounds = s.RoundsMax
	}

	saltLen := (length * 6 / 8)
	if (length*6)%8 != 0 {
		saltLen++
	}
	salt := make([]byte, saltLen)
	rand.Read(salt)

	roundsText := ""
	if rounds != s.RoundsDefault {
		roundsText = "rounds=" + strconv.Itoa(rounds) + "$"
	}

	out := make([]byte, len(s.MagicPrefix)+len(roundsText)+length)
	copy(out, s.MagicPrefix)
	copy(out[len(s.MagicPrefix):], []byte(roundsText))
	copy(out[len(s.MagicPrefix)+len(roundsText):], Base64_24Bit(salt))
	return out
}
