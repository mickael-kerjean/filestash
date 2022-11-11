// Copyright 2012, Jeramey Crawford <jeramey@antihe.ro>
// Copyright 2013, Jonas mg
// All rights reserved.
//
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file.

// Package md5_crypt implements the standard Unix MD5-crypt algorithm created by
// Poul-Henning Kamp for FreeBSD.
package md5_crypt

import (
	"bytes"
	"crypto/md5"

	"github.com/tredoe/osutil/user/crypt"
	"github.com/tredoe/osutil/user/crypt/common"
)

func init() {
	crypt.RegisterCrypt(crypt.MD5, New, MagicPrefix)
}

// NOTE: Cisco IOS only allows salts of length 4.

const (
	MagicPrefix   = "$1$"
	SaltLenMin    = 1 // Real minimum is 0, but that isn't useful.
	SaltLenMax    = 8
	RoundsDefault = 1000
)

type crypter struct{ Salt common.Salt }

// New returns a new crypt.Crypter computing the MD5-crypt password hashing.
func New() crypt.Crypter {
	return &crypter{GetSalt()}
}

func (c *crypter) Generate(key, salt []byte) (string, error) {
	if len(salt) == 0 {
		salt = c.Salt.Generate(SaltLenMax)
	}
	if !bytes.HasPrefix(salt, c.Salt.MagicPrefix) {
		return "", common.ErrSaltPrefix
	}

	saltToks := bytes.Split(salt, []byte{'$'})

	if len(saltToks) < 3 {
		return "", common.ErrSaltFormat
	} else {
		salt = saltToks[2]
	}
	if len(salt) > 8 {
		salt = salt[0:8]
	}

	// Compute alternate MD5 sum with input KEY, SALT, and KEY.
	Alternate := md5.New()
	Alternate.Write(key)
	Alternate.Write(salt)
	Alternate.Write(key)
	AlternateSum := Alternate.Sum(nil) // 16 bytes

	A := md5.New()
	A.Write(key)
	A.Write(c.Salt.MagicPrefix)
	A.Write(salt)
	// Add for any character in the key one byte of the alternate sum.
	i := len(key)
	for ; i > 16; i -= 16 {
		A.Write(AlternateSum)
	}
	A.Write(AlternateSum[0:i])

	// The original implementation now does something weird:
	//   For every 1 bit in the key, the first 0 is added to the buffer
	//   For every 0 bit, the first character of the key
	// This does not seem to be what was intended but we have to follow this to
	// be compatible.
	for i = len(key); i > 0; i >>= 1 {
		if (i & 1) == 0 {
			A.Write(key[0:1])
		} else {
			A.Write([]byte{0})
		}
	}
	Csum := A.Sum(nil)

	// In fear of password crackers here comes a quite long loop which just
	// processes the output of the previous round again.
	// We cannot ignore this here.
	for i = 0; i < RoundsDefault; i++ {
		C := md5.New()

		// Add key or last result.
		if (i & 1) != 0 {
			C.Write(key)
		} else {
			C.Write(Csum)
		}
		// Add salt for numbers not divisible by 3.
		if (i % 3) != 0 {
			C.Write(salt)
		}
		// Add key for numbers not divisible by 7.
		if (i % 7) != 0 {
			C.Write(key)
		}
		// Add key or last result.
		if (i & 1) == 0 {
			C.Write(key)
		} else {
			C.Write(Csum)
		}

		Csum = C.Sum(nil)
	}

	out := make([]byte, 0, 23+len(c.Salt.MagicPrefix)+len(salt))
	out = append(out, c.Salt.MagicPrefix...)
	out = append(out, salt...)
	out = append(out, '$')
	out = append(out, common.Base64_24Bit([]byte{
		Csum[12], Csum[6], Csum[0],
		Csum[13], Csum[7], Csum[1],
		Csum[14], Csum[8], Csum[2],
		Csum[15], Csum[9], Csum[3],
		Csum[5], Csum[10], Csum[4],
		Csum[11],
	})...)

	// Clean sensitive data.
	A.Reset()
	Alternate.Reset()
	for i = 0; i < len(AlternateSum); i++ {
		AlternateSum[i] = 0
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

func (c *crypter) Cost(hashedKey string) (int, error) { return RoundsDefault, nil }

func (c *crypter) SetSalt(salt common.Salt) { c.Salt = salt }

func GetSalt() common.Salt {
	return common.Salt{
		MagicPrefix:   []byte(MagicPrefix),
		SaltLenMin:    SaltLenMin,
		SaltLenMax:    SaltLenMax,
		RoundsDefault: RoundsDefault,
	}
}
