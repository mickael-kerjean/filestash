package aescbc

import (
	"crypto/cipher"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/subtle"
	"encoding/binary"
	"fmt"
	"hash"

	"github.com/lestrrat-go/pdebug/v3"
	"github.com/pkg/errors"
)

const (
	NonceSize = 16
)

func pad(buf []byte, n int) []byte {
	rem := n - len(buf)%n
	if rem == 0 {
		return buf
	}

	newbuf := make([]byte, len(buf)+rem)
	copy(newbuf, buf)

	for i := len(buf); i < len(newbuf); i++ {
		newbuf[i] = byte(rem)
	}
	return newbuf
}

func unpad(buf []byte, n int) ([]byte, error) {
	lbuf := len(buf)
	rem := lbuf % n
	if rem != 0 {
		return nil, errors.Errorf("input buffer must be multiple of block size %d", n)
	}

	count := 0
	last := buf[lbuf-1]
	for i := lbuf - 1; i >= 0; i-- {
		if buf[i] != last {
			break
		}
		count++
	}
	if count != int(last) {
		return nil, errors.New("invalid padding")
	}

	return buf[:lbuf-int(last)], nil
}

type Hmac struct {
	blockCipher  cipher.Block
	hash         func() hash.Hash
	keysize      int
	tagsize      int
	integrityKey []byte
}

type BlockCipherFunc func([]byte) (cipher.Block, error)

func New(key []byte, f BlockCipherFunc) (hmac *Hmac, err error) {
	if pdebug.Enabled {
		g := pdebug.FuncMarker().BindError(&err)
		defer g.End()
	}
	keysize := len(key) / 2
	ikey := key[:keysize]
	ekey := key[keysize:]

	if pdebug.Enabled {
		pdebug.Printf("New: keysize               = %d", keysize)
		pdebug.Printf("New: cek (key)             = %x (%d)\n", key, len(key))
		pdebug.Printf("New: ikey                  = %x (%d)\n", ikey, len(ikey))
		pdebug.Printf("New: ekey                  = %x (%d)\n", ekey, len(ekey))
	}

	bc, ciphererr := f(ekey)
	if ciphererr != nil {
		err = errors.Wrap(ciphererr, `failed to execute block cipher function`)
		return
	}

	var hfunc func() hash.Hash
	switch keysize {
	case 16:
		hfunc = sha256.New
	case 24:
		hfunc = sha512.New384
	case 32:
		hfunc = sha512.New
	default:
		return nil, errors.Errorf("unsupported key size %d", keysize)
	}

	return &Hmac{
		blockCipher:  bc,
		hash:         hfunc,
		integrityKey: ikey,
		keysize:      keysize,
		tagsize:      keysize, // NonceSize,
		// While investigating GH #207, I stumbled upon another problem where
		// the computed tags don't match on decrypt. After poking through the
		// code using a bunch of debug statements, I've finally found out that
		// tagsize = keysize makes the whole thing work.
	}, nil
}

// NonceSize fulfills the crypto.AEAD interface
func (c Hmac) NonceSize() int {
	return NonceSize
}

// Overhead fulfills the crypto.AEAD interface
func (c Hmac) Overhead() int {
	return c.blockCipher.BlockSize() + c.tagsize
}

func (c Hmac) ComputeAuthTag(aad, nonce, ciphertext []byte) ([]byte, error) {
	if pdebug.Enabled {
		pdebug.Printf("ComputeAuthTag: aad        = %x (%d)\n", aad, len(aad))
		pdebug.Printf("ComputeAuthTag: ciphertext = %x (%d)\n", ciphertext, len(ciphertext))
		pdebug.Printf("ComputeAuthTag: iv (nonce) = %x (%d)\n", nonce, len(nonce))
		pdebug.Printf("ComputeAuthTag: integrity  = %x (%d)\n", c.integrityKey, len(c.integrityKey))
	}

	buf := make([]byte, len(aad)+len(nonce)+len(ciphertext)+8)
	n := 0
	n += copy(buf, aad)
	n += copy(buf[n:], nonce)
	n += copy(buf[n:], ciphertext)
	binary.BigEndian.PutUint64(buf[n:], uint64(len(aad)*8))

	h := hmac.New(c.hash, c.integrityKey)
	if _, err := h.Write(buf); err != nil {
		return nil, errors.Wrap(err, "failed to write ComputeAuthTag using Hmac")
	}
	s := h.Sum(nil)
	if pdebug.Enabled {
		pdebug.Printf("ComputeAuthTag: buf        = %x (%d)\n", buf, len(buf))
		pdebug.Printf("ComputeAuthTag: computed   = %x (%d)\n", s[:c.tagsize], len(s[:c.tagsize]))
	}
	return s[:c.tagsize], nil
}

func ensureSize(dst []byte, n int) []byte {
	// if the dst buffer has enough length just copy the relevant parts to it.
	// Otherwise create a new slice that's big enough, and operate on that
	// Note: I think go-jose has a bug in that it checks for cap(), but not len().
	ret := dst
	if diff := n - len(dst); diff > 0 {
		// dst is not big enough
		ret = make([]byte, n)
		copy(ret, dst)
	}
	return ret
}

// Seal fulfills the crypto.AEAD interface
func (c Hmac) Seal(dst, nonce, plaintext, data []byte) []byte {
	ctlen := len(plaintext)
	ciphertext := make([]byte, ctlen+c.Overhead())[:ctlen]
	copy(ciphertext, plaintext)
	ciphertext = pad(ciphertext, c.blockCipher.BlockSize())

	cbc := cipher.NewCBCEncrypter(c.blockCipher, nonce)
	cbc.CryptBlocks(ciphertext, ciphertext)

	authtag, err := c.ComputeAuthTag(data, nonce, ciphertext)
	if err != nil {
		// Hmac implements cipher.AEAD interface. Seal can't return error.
		// But currently it never reach here because of Hmac.ComputeAuthTag doesn't return error.
		panic(fmt.Errorf("failed to seal on hmac: %v", err))
	}

	retlen := len(dst) + len(ciphertext) + len(authtag)

	ret := ensureSize(dst, retlen)
	out := ret[len(dst):]
	n := copy(out, ciphertext)
	copy(out[n:], authtag)

	if pdebug.Enabled {
		pdebug.Printf("Seal: ciphertext = %x (%d)\n", ciphertext, len(ciphertext))
		pdebug.Printf("Seal: authtag    = %x (%d)\n", authtag, len(authtag))
		pdebug.Printf("Seal: ret        = %x (%d)\n", ret, len(ret))
	}
	return ret
}

// Open fulfills the crypto.AEAD interface
func (c Hmac) Open(dst, nonce, ciphertext, data []byte) ([]byte, error) {
	if pdebug.Enabled {
		g := pdebug.FuncMarker()
		defer g.End()
	}

	if len(ciphertext) < c.keysize {
		return nil, errors.New("invalid ciphertext (too short)")
	}

	tagOffset := len(ciphertext) - c.tagsize
	if tagOffset%c.blockCipher.BlockSize() != 0 {
		return nil, fmt.Errorf(
			"invalid ciphertext (invalid length: %d %% %d != 0)",
			tagOffset,
			c.blockCipher.BlockSize(),
		)
	}
	tag := ciphertext[tagOffset:]
	ciphertext = ciphertext[:tagOffset]

	expectedTag, err := c.ComputeAuthTag(data, nonce, ciphertext[:tagOffset])
	if err != nil {
		return nil, errors.Wrap(err, `failed to compute auth tag`)
	}

	if subtle.ConstantTimeCompare(expectedTag, tag) != 1 {
		if pdebug.Enabled {
			pdebug.Printf("provided tag = %x\n", tag)
			pdebug.Printf("expected tag = %x\n", expectedTag)
		}
		return nil, errors.New("invalid ciphertext (tag mismatch)")
	}

	cbc := cipher.NewCBCDecrypter(c.blockCipher, nonce)
	buf := make([]byte, tagOffset)
	cbc.CryptBlocks(buf, ciphertext)

	plaintext, err := unpad(buf, c.blockCipher.BlockSize())
	if err != nil {
		return nil, errors.Wrap(err, `failed to generate plaintext from decrypted blocks`)
	}
	ret := ensureSize(dst, len(plaintext))
	out := ret[len(dst):]
	copy(out, plaintext)
	return ret, nil
}
