// Copyright 2012, Jeramey Crawford <jeramey@antihe.ro>
// Copyright 2013, Jonas mg
// All rights reserved.
//
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file.

// Package sha512_crypt implements Ulrich Drepper's SHA512-crypt password
// hashing algorithm.
//
// The specification for this algorithm can be found here:
// http://www.akkadia.org/drepper/SHA-crypt.txt
package sha512_crypt

import (
	"bytes"
	"crypto/sha512"
	"strconv"

	"github.com/tredoe/osutil/user/crypt"
	"github.com/tredoe/osutil/user/crypt/common"
)

func init() {
	crypt.RegisterCrypt(crypt.SHA512, New, MagicPrefix)
}

const (
	MagicPrefix   = "$6$"
	SaltLenMin    = 1
	SaltLenMax    = 16
	RoundsMin     = 1000
	RoundsMax     = 999999999
	RoundsDefault = 5000
)

var _rounds = []byte("rounds=")

type crypter struct{ Salt common.Salt }

// New returns a new crypt.Crypter computing the SHA512-crypt password hashing.
func New() crypt.Crypter {
	return &crypter{GetSalt()}
}

func (c *crypter) Generate(key, salt []byte) (string, error) {
	var rounds int
	var isRoundsDef bool

	if len(salt) == 0 {
		salt = c.Salt.GenerateWRounds(SaltLenMax, RoundsDefault)
	}
	if !bytes.HasPrefix(salt, c.Salt.MagicPrefix) {
		return "", common.ErrSaltPrefix
	}

	saltToks := bytes.Split(salt, []byte{'$'})
	if len(saltToks) < 3 {
		return "", common.ErrSaltFormat
	}

	if bytes.HasPrefix(saltToks[2], _rounds) {
		isRoundsDef = true
		pr, err := strconv.ParseInt(string(saltToks[2][7:]), 10, 32)
		if err != nil {
			return "", common.ErrSaltRounds
		}
		rounds = int(pr)
		if rounds < RoundsMin {
			rounds = RoundsMin
		} else if rounds > RoundsMax {
			rounds = RoundsMax
		}
		salt = saltToks[3]
	} else {
		rounds = RoundsDefault
		salt = saltToks[2]
	}

	if len(salt) > SaltLenMax {
		salt = salt[0:SaltLenMax]
	}

	// Compute alternate SHA512 sum with input KEY, SALT, and KEY.
	Alternate := sha512.New()
	Alternate.Write(key)
	Alternate.Write(salt)
	Alternate.Write(key)
	AlternateSum := Alternate.Sum(nil) // 64 bytes

	A := sha512.New()
	A.Write(key)
	A.Write(salt)
	// Add for any character in the key one byte of the alternate sum.
	i := len(key)
	for ; i > 64; i -= 64 {
		A.Write(AlternateSum)
	}
	A.Write(AlternateSum[0:i])

	// Take the binary representation of the length of the key and for every add
	// the alternate sum, for every 0 the key.
	for i = len(key); i > 0; i >>= 1 {
		if (i & 1) != 0 {
			A.Write(AlternateSum)
		} else {
			A.Write(key)
		}
	}
	Asum := A.Sum(nil)

	// Start computation of P byte sequence.
	P := sha512.New()
	// For every character in the password add the entire password.
	for i = 0; i < len(key); i++ {
		P.Write(key)
	}
	Psum := P.Sum(nil)
	// Create byte sequence P.
	Pseq := make([]byte, 0, len(key))
	for i = len(key); i > 64; i -= 64 {
		Pseq = append(Pseq, Psum...)
	}
	Pseq = append(Pseq, Psum[0:i]...)

	// Start computation of S byte sequence.
	S := sha512.New()
	for i = 0; i < (16 + int(Asum[0])); i++ {
		S.Write(salt)
	}
	Ssum := S.Sum(nil)
	// Create byte sequence S.
	Sseq := make([]byte, 0, len(salt))
	for i = len(salt); i > 64; i -= 64 {
		Sseq = append(Sseq, Ssum...)
	}
	Sseq = append(Sseq, Ssum[0:i]...)

	Csum := Asum

	// Repeatedly run the collected hash value through SHA512 to burn CPU cycles.
	for i = 0; i < rounds; i++ {
		C := sha512.New()

		// Add key or last result.
		if (i & 1) != 0 {
			C.Write(Pseq)
		} else {
			C.Write(Csum)
		}
		// Add salt for numbers not divisible by 3.
		if (i % 3) != 0 {
			C.Write(Sseq)
		}
		// Add key for numbers not divisible by 7.
		if (i % 7) != 0 {
			C.Write(Pseq)
		}
		// Add key or last result.
		if (i & 1) != 0 {
			C.Write(Csum)
		} else {
			C.Write(Pseq)
		}

		Csum = C.Sum(nil)
	}

	out := make([]byte, 0, 123)
	out = append(out, c.Salt.MagicPrefix...)
	if isRoundsDef {
		out = append(out, []byte("rounds="+strconv.Itoa(rounds)+"$")...)
	}
	out = append(out, salt...)
	out = append(out, '$')
	out = append(out, common.Base64_24Bit([]byte{
		Csum[42], Csum[21], Csum[0],
		Csum[1], Csum[43], Csum[22],
		Csum[23], Csum[2], Csum[44],
		Csum[45], Csum[24], Csum[3],
		Csum[4], Csum[46], Csum[25],
		Csum[26], Csum[5], Csum[47],
		Csum[48], Csum[27], Csum[6],
		Csum[7], Csum[49], Csum[28],
		Csum[29], Csum[8], Csum[50],
		Csum[51], Csum[30], Csum[9],
		Csum[10], Csum[52], Csum[31],
		Csum[32], Csum[11], Csum[53],
		Csum[54], Csum[33], Csum[12],
		Csum[13], Csum[55], Csum[34],
		Csum[35], Csum[14], Csum[56],
		Csum[57], Csum[36], Csum[15],
		Csum[16], Csum[58], Csum[37],
		Csum[38], Csum[17], Csum[59],
		Csum[60], Csum[39], Csum[18],
		Csum[19], Csum[61], Csum[40],
		Csum[41], Csum[20], Csum[62],
		Csum[63],
	})...)

	// Clean sensitive data.
	A.Reset()
	Alternate.Reset()
	P.Reset()
	for i = 0; i < len(Asum); i++ {
		Asum[i] = 0
	}
	for i = 0; i < len(AlternateSum); i++ {
		AlternateSum[i] = 0
	}
	for i = 0; i < len(Pseq); i++ {
		Pseq[i] = 0
	}

	return string(out), nil
}

func (c *crypter) Verify(hashedKey string, key []byte) error {
	newHash, err := c.Generate(key, []byte(hashedKey))
	if err != nil {
		return err
	}
	if newHash != hashedKey {
		return crypt.ErrKeyMismatch
	}
	return nil
}

func (c *crypter) Cost(hashedKey string) (int, error) {
	saltToks := bytes.Split([]byte(hashedKey), []byte{'$'})
	if len(saltToks) < 3 {
		return 0, common.ErrSaltFormat
	}

	if !bytes.HasPrefix(saltToks[2], _rounds) {
		return RoundsDefault, nil
	}
	roundToks := bytes.Split(saltToks[2], []byte{'='})
	cost, err := strconv.ParseInt(string(roundToks[1]), 10, 0)
	return int(cost), err
}

func (c *crypter) SetSalt(salt common.Salt) { c.Salt = salt }

func GetSalt() common.Salt {
	return common.Salt{
		MagicPrefix:   []byte(MagicPrefix),
		SaltLenMin:    SaltLenMin,
		SaltLenMax:    SaltLenMax,
		RoundsDefault: RoundsDefault,
		RoundsMin:     RoundsMin,
		RoundsMax:     RoundsMax,
	}
}
