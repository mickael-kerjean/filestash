// Package ed25519 implements Tor/BitTorrent-like ed25519 keys.
//
// See the following stack overflow post for details on why
// golang.org/x/crypto/ed25519 can't be used:
//  https://stackoverflow.com/questions/44810708/ed25519-public-result-is-different
package ed25519

import (
	"crypto"
	"crypto/rand"
	"crypto/sha512"
	"errors"
	"io"

	"github.com/cretz/bine/torutil/ed25519/internal/edwards25519"
	"golang.org/x/crypto/ed25519"
)

const (
	// PublicKeySize is the size, in bytes, of public keys as used in this package.
	PublicKeySize = 32
	// PrivateKeySize is the size, in bytes, of private keys as used in this package.
	PrivateKeySize = 64
	// SignatureSize is the size, in bytes, of signatures generated and verified by this package.
	SignatureSize = 64
)

// PrivateKey is a 64-byte Ed25519 private key. Unlike
// golang.org/x/crypto/ed25519, this is just the digest and does not contain
// the public key within it. Instead call PublicKey() or better, call KeyPair()
// which stores the precomputed public key.
type PrivateKey []byte

// PublicKey is a 32-byte Ed25519 public key.
type PublicKey []byte

// FromCryptoPrivateKey converts a Go private key to the one in this package.
func FromCryptoPrivateKey(key ed25519.PrivateKey) KeyPair {
	digest := sha512.Sum512(key[:32])
	digest[0] &= 248
	digest[31] &= 127
	digest[31] |= 64
	return &precomputedKeyPair{PrivateKeyBytes: digest[:], PublicKeyBytes: PublicKey(key[32:])}
}

// FromCryptoPublicKey converts a Go public key to the one in this package.
func FromCryptoPublicKey(key ed25519.PublicKey) PublicKey {
	return PublicKey(key)
}

// KeyPair returns a new key pair with the public key precomputed.
func (p PrivateKey) KeyPair() KeyPair {
	return &precomputedKeyPair{PrivateKeyBytes: p, PublicKeyBytes: p.PublicKey()}
}

// PrivateKey simply returns itself. Implements KeyPair.PrivateKey.
func (p PrivateKey) PrivateKey() PrivateKey { return p }

// Public simply delegates to PublicKey() to satisfy crypto.Signer. This method
// does a bit more work than the traditional Go ed25519's private key's Public()
// method so developers are encouraged to reuse the result or use KeyPair()
// which stores this value.
func (p PrivateKey) Public() crypto.PublicKey { return p.PublicKey() }

// PublicKey generates a public key for this private key. This method does a bit
// more work than the traditional Go ed25519's private key's Public() method so
// developers are encouraged to reuse the result or use KeyPair() which stores
// this value. Implements KeyPair.PublicKey.
func (p PrivateKey) PublicKey() PublicKey {
	var A edwards25519.ExtendedGroupElement
	var hBytes [32]byte
	copy(hBytes[:], p[:])
	edwards25519.GeScalarMultBase(&A, &hBytes)
	var publicKeyBytes [32]byte
	A.ToBytes(&publicKeyBytes)
	return publicKeyBytes[:]
}

// Sign signs the given message with priv. Ed25519 performs two passes over
// messages to be signed and therefore cannot handle pre-hashed messages. Thus
// opts.HashFunc() must return zero to indicate the message hasn't been hashed.
// This can be achieved by passing crypto.Hash(0) as the value for opts.
func (p PrivateKey) Sign(rand io.Reader, message []byte, opts crypto.SignerOpts) ([]byte, error) {
	if opts.HashFunc() != crypto.Hash(0) {
		return nil, errors.New("ed25519: cannot sign hashed message")
	}
	return Sign(p, message), nil
}

// Verify simply calls PublicKey().Verify(). Callers are encouraged to instead
// store a precomputed KeyPair (via KeyPair() or GenerateKey()) and call Verify
// on that.
func (p PrivateKey) Verify(message []byte, sig []byte) bool {
	return p.PublicKey().Verify(message, sig)
}

// Verify simply calls the package-level function Verify().
func (p PublicKey) Verify(message []byte, sig []byte) bool {
	return Verify(p, message, sig)
}

// KeyPair is an interface for types with both keys. While PrivateKey does
// implement this, it generates the PublicKey on demand. For better performance,
// use the result of GenerateKey directly or call PrivateKey.KeyPair().
type KeyPair interface {
	crypto.Signer
	PrivateKey() PrivateKey
	PublicKey() PublicKey
	Verify(message []byte, sig []byte) bool
}

type precomputedKeyPair struct {
	PrivateKeyBytes PrivateKey
	PublicKeyBytes  PublicKey
}

func (p *precomputedKeyPair) PrivateKey() PrivateKey   { return p.PrivateKeyBytes }
func (p *precomputedKeyPair) PublicKey() PublicKey     { return p.PublicKeyBytes }
func (p *precomputedKeyPair) Public() crypto.PublicKey { return p.PublicKey() }
func (p *precomputedKeyPair) Sign(rand io.Reader, message []byte, opts crypto.SignerOpts) ([]byte, error) {
	if opts.HashFunc() != crypto.Hash(0) {
		return nil, errors.New("ed25519: cannot sign hashed message")
	}
	return Sign(p, message), nil
}
func (p *precomputedKeyPair) Verify(message []byte, sig []byte) bool {
	return p.PublicKeyBytes.Verify(message, sig)
}

// GenerateKey generates a public/private key pair using entropy from rand.
// If rand is nil, crypto/rand.Reader will be used.
func GenerateKey(rnd io.Reader) (KeyPair, error) {
	if rnd == nil {
		rnd = rand.Reader
	}
	rndByts := make([]byte, 32)
	if _, err := io.ReadFull(rnd, rndByts); err != nil {
		return nil, err
	}
	digest := sha512.Sum512(rndByts)
	digest[0] &= 248
	digest[31] &= 127
	digest[31] |= 64
	return PrivateKey(digest[:]).KeyPair(), nil
}

// Sign signs the message with the given key pair.
func Sign(keyPair KeyPair, message []byte) []byte {
	// Ref: https://stackoverflow.com/questions/44810708/ed25519-public-result-is-different

	var privateKeyA [32]byte
	copy(privateKeyA[:], keyPair.PrivateKey()) // we need this in an array later
	var messageDigest, hramDigest [64]byte

	h := sha512.New()
	h.Write(keyPair.PrivateKey()[32:])
	h.Write(message)
	h.Sum(messageDigest[:0])

	var messageDigestReduced [32]byte
	edwards25519.ScReduce(&messageDigestReduced, &messageDigest)
	var R edwards25519.ExtendedGroupElement
	edwards25519.GeScalarMultBase(&R, &messageDigestReduced)

	var encodedR [32]byte
	R.ToBytes(&encodedR)

	h.Reset()
	h.Write(encodedR[:])
	h.Write(keyPair.PublicKey())
	h.Write(message)
	h.Sum(hramDigest[:0])
	var hramDigestReduced [32]byte
	edwards25519.ScReduce(&hramDigestReduced, &hramDigest)

	var s [32]byte
	edwards25519.ScMulAdd(&s, &hramDigestReduced, &privateKeyA, &messageDigestReduced)

	signature := make([]byte, 64)
	copy(signature[:], encodedR[:])
	copy(signature[32:], s[:])

	return signature
}

// Verify verifies a signed message.
func Verify(p PublicKey, message []byte, sig []byte) bool {
	return ed25519.Verify(ed25519.PublicKey(p), message, sig)
}
