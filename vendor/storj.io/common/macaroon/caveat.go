// Copyright (C) 2019 Storj Labs, Inc.
// See LICENSE for copying information.

package macaroon

import (
	crand "crypto/rand"
	"encoding/binary"
	"encoding/json"
	mrand "math/rand"
	"time"

	"storj.io/common/encryption"
	"storj.io/common/storj"
)

// WithNonce returns a Caveat with the nonce set to a random value.
// Note: This does a shallow copy the provided Caveat.
func WithNonce(in Caveat) Caveat {
	var buf [4]byte

	if n, _ := crand.Read(buf[:]); n != len(buf) {
		rng := mrand.New(mrand.NewSource(time.Now().UnixNano()))
		binary.LittleEndian.PutUint32(buf[:], rng.Uint32())
	}

	in.Nonce = buf[:]

	return in
}

type caveatPathMarshal struct {
	Bucket              string `json:"bucket,omitempty"`
	EncryptedPathPrefix string `json:"encrypted_path_prefix,omitempty"`
}

// MarshalJSON implements the json.Marshaler interface.
func (cp *Caveat_Path) MarshalJSON() ([]byte, error) {
	key, err := storj.NewKey([]byte{})
	if err != nil {
		return nil, err
	}

	prefix, err := encryption.DecryptPathRaw(string(cp.EncryptedPathPrefix), storj.EncNullBase64URL, key)
	if err != nil {
		return nil, err
	}

	return json.Marshal(caveatPathMarshal{
		Bucket:              string(cp.Bucket),
		EncryptedPathPrefix: prefix,
	})
}
