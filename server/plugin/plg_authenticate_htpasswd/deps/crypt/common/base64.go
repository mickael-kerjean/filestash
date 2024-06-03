// Copyright 2012, Jeramey Crawford <jeramey@antihe.ro>
// Copyright 2013, Jonas mg
// All rights reserved.
//
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file.

package common

const alphabet = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

// Base64_24Bit is a variant of Base64 encoding, commonly used with password
// hashing algorithms to encode the result of their checksum output.
//
// The algorithm operates on up to 3 bytes at a time, encoding the following
// 6-bit sequences into up to 4 hash64 ASCII bytes.
//
//   1. Bottom 6 bits of the first byte
//   2. Top 2 bits of the first byte, and bottom 4 bits of the second byte.
//   3. Top 4 bits of the second byte, and bottom 2 bits of the third byte.
//   4. Top 6 bits of the third byte.
//
// This encoding method does not emit padding bytes as Base64 does.
func Base64_24Bit(src []byte) (hash []byte) {
	if len(src) == 0 {
		return []byte{} // TODO: return nil
	}

	hashSize := (len(src) * 8) / 6
	if (len(src) % 6) != 0 {
		hashSize += 1
	}
	hash = make([]byte, hashSize)

	dst := hash
	for len(src) > 0 {
		switch len(src) {
		default:
			dst[0] = alphabet[src[0]&0x3f]
			dst[1] = alphabet[((src[0]>>6)|(src[1]<<2))&0x3f]
			dst[2] = alphabet[((src[1]>>4)|(src[2]<<4))&0x3f]
			dst[3] = alphabet[(src[2]>>2)&0x3f]
			src = src[3:]
			dst = dst[4:]
		case 2:
			dst[0] = alphabet[src[0]&0x3f]
			dst[1] = alphabet[((src[0]>>6)|(src[1]<<2))&0x3f]
			dst[2] = alphabet[(src[1]>>4)&0x3f]
			src = src[2:]
			dst = dst[3:]
		case 1:
			dst[0] = alphabet[src[0]&0x3f]
			dst[1] = alphabet[(src[0]>>6)&0x3f]
			src = src[1:]
			dst = dst[2:]
		}
	}

	return
}
