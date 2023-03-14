package cipher

import (
	"crypto/aes"
	"crypto/cipher"
	"fmt"

	"github.com/lestrrat-go/jwx/jwa"
	"github.com/lestrrat-go/jwx/jwe/internal/aescbc"
	"github.com/lestrrat-go/jwx/jwe/internal/keygen"
	"github.com/lestrrat-go/pdebug/v3"
	"github.com/pkg/errors"
)

var gcm = &gcmFetcher{}
var cbc = &cbcFetcher{}

func (f gcmFetcher) Fetch(key []byte) (cipher.AEAD, error) {
	aescipher, err := aes.NewCipher(key)
	if err != nil {
		if pdebug.Enabled {
			pdebug.Printf("gcmFetcher: failed to create cipher")
		}
		return nil, errors.Wrap(err, "cipher: failed to create AES cipher for GCM")
	}

	aead, err := cipher.NewGCM(aescipher)
	if err != nil {
		return nil, errors.Wrap(err, `failed to create GCM for cipher`)
	}
	return aead, nil
}

func (f cbcFetcher) Fetch(key []byte) (cipher.AEAD, error) {
	if pdebug.Enabled {
		g := pdebug.FuncMarker()
		defer g.End()
	}
	aead, err := aescbc.New(key, aes.NewCipher)
	if err != nil {
		if pdebug.Enabled {
			pdebug.Printf("CbcAeadFetch: failed to create aead fetcher %v (%d): %s", key, len(key), err)
		}
		return nil, errors.Wrap(err, "cipher: failed to create AES cipher for CBC")
	}
	return aead, nil
}

func (c AesContentCipher) KeySize() int {
	return c.keysize
}

func (c AesContentCipher) TagSize() int {
	return c.tagsize
}

func NewAES(alg jwa.ContentEncryptionAlgorithm) (*AesContentCipher, error) {
	if pdebug.Enabled {
		g := pdebug.FuncMarker()
		defer g.End()
	}

	var keysize int
	var tagsize int
	var fetcher Fetcher
	switch alg {
	case jwa.A128GCM:
		keysize = 16
		tagsize = 16
		fetcher = gcm
	case jwa.A192GCM:
		keysize = 24
		tagsize = 16
		fetcher = gcm
	case jwa.A256GCM:
		keysize = 32
		tagsize = 16
		fetcher = gcm
	case jwa.A128CBC_HS256:
		tagsize = 16
		keysize = tagsize * 2
		fetcher = cbc
	case jwa.A192CBC_HS384:
		tagsize = 24
		keysize = tagsize * 2
		fetcher = cbc
	case jwa.A256CBC_HS512:
		tagsize = 32
		keysize = tagsize * 2
		fetcher = cbc
	default:
		return nil, errors.Errorf("failed to create AES content cipher: invalid algorithm (%s)", alg)
	}

	if pdebug.Enabled {
		if fetcher == gcm {
			pdebug.Printf("Using GCM")
		} else {
			pdebug.Printf("using CBC")
		}
	}

	return &AesContentCipher{
		keysize: keysize,
		tagsize: tagsize,
		fetch:   fetcher,
	}, nil
}

func (c AesContentCipher) Encrypt(cek, plaintext, aad []byte) (iv, ciphertext, tag []byte, err error) {
	var aead cipher.AEAD
	aead, err = c.fetch.Fetch(cek)
	if err != nil {
		if pdebug.Enabled {
			pdebug.Printf("AeadFetch failed: %s", err)
		}
		return nil, nil, nil, errors.Wrap(err, "failed to fetch AEAD")
	}

	// Seal may panic (argh!), so protect ourselves from that
	defer func() {
		if e := recover(); e != nil {
			switch e := e.(type) {
			case error:
				err = e
			case string:
				err = errors.New(e)
			default:
				err = fmt.Errorf("%s", e)
			}
			err = errors.Wrap(err, "failed to encrypt")
		}
	}()

	var bs keygen.ByteSource
	if c.NonceGenerator == nil {
		bs, err = keygen.NewRandom(aead.NonceSize()).Generate()
	} else {
		bs, err = c.NonceGenerator.Generate()
	}
	if err != nil {
		return nil, nil, nil, errors.Wrap(err, "failed to generate nonce")
	}
	iv = bs.Bytes()

	combined := aead.Seal(nil, iv, plaintext, aad)
	tagoffset := len(combined) - c.TagSize()

	if tagoffset < 0 {
		panic(fmt.Sprintf("tag offset is less than 0 (combined len = %d, tagsize = %d)", len(combined), c.TagSize()))
	}

	if pdebug.Enabled {
		pdebug.Printf("tagsize = %d", c.TagSize())
	}
	tag = combined[tagoffset:]
	ciphertext = make([]byte, tagoffset)
	copy(ciphertext, combined[:tagoffset])

	if pdebug.Enabled {
		pdebug.Printf("encrypt: combined   = %x (%d)\n", combined, len(combined))
		pdebug.Printf("encrypt: ciphertext = %x (%d)\n", ciphertext, len(ciphertext))
		pdebug.Printf("encrypt: tag        = %x (%d)\n", tag, len(tag))
		pdebug.Printf("finally ciphertext = %x\n", ciphertext)
	}
	return
}

func (c AesContentCipher) Decrypt(cek, iv, ciphertxt, tag, aad []byte) (plaintext []byte, err error) {
	if pdebug.Enabled {
		g := pdebug.FuncMarker().BindError(&err)
		defer g.End()
	}

	aead, err := c.fetch.Fetch(cek)
	if err != nil {
		if pdebug.Enabled {
			pdebug.Printf("AeadFetch failed for %x: %s", cek, err)
		}
		return nil, errors.Wrap(err, "failed to fetch AEAD data")
	}

	// Open may panic (argh!), so protect ourselves from that
	defer func() {
		if e := recover(); e != nil {
			switch e := e.(type) {
			case error:
				err = e
			case string:
				err = errors.New(e)
			default:
				err = fmt.Errorf("%s", e)
			}
			err = errors.Wrap(err, "failed to decrypt")
			return
		}
	}()

	combined := make([]byte, len(ciphertxt)+len(tag))
	copy(combined, ciphertxt)
	copy(combined[len(ciphertxt):], tag)

	if pdebug.Enabled {
		pdebug.Printf("AesContentCipher.decrypt: cek      = %x (%d)", cek, len(cek))
		pdebug.Printf("AesContentCipher.decrypt: iv       = %x (%d)", iv, len(iv))
		pdebug.Printf("AesContentCipher.decrypt: tag      = %x (%d)", tag, len(tag))
		pdebug.Printf("AesContentCipher.decrypt: aad      = %x (%d)", aad, len(aad))
		pdebug.Printf("AesContentCipher.decrypt: combined = %x (%d)", combined, len(combined))
	}

	buf, aeaderr := aead.Open(nil, iv, combined, aad)
	if aeaderr != nil {
		err = errors.Wrap(aeaderr, `aead.Open failed`)
		return
	}
	plaintext = buf
	return
}
