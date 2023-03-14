package content_crypt //nolint:golint

import (
	"github.com/lestrrat-go/jwx/jwa"
	"github.com/lestrrat-go/jwx/jwe/internal/cipher"
	"github.com/lestrrat-go/pdebug/v3"
	"github.com/pkg/errors"
)

func (c Generic) Algorithm() jwa.ContentEncryptionAlgorithm {
	return c.alg
}

func (c Generic) Encrypt(cek, plaintext, aad []byte) ([]byte, []byte, []byte, error) {
	if pdebug.Enabled {
		pdebug.Printf("ContentCrypt.Encrypt: cek        = %x (%d)", cek, len(cek))
		pdebug.Printf("ContentCrypt.Encrypt: plaintext  = %x (%d)", plaintext, len(plaintext))
		pdebug.Printf("ContentCrypt.Encrypt: aad        = %x (%d)", aad, len(aad))
	}
	iv, encrypted, tag, err := c.cipher.Encrypt(cek, plaintext, aad)
	if err != nil {
		if pdebug.Enabled {
			pdebug.Printf("cipher.encrypt failed")
		}

		return nil, nil, nil, errors.Wrap(err, `failed to crypt content`)
	}

	return iv, encrypted, tag, nil
}

func (c Generic) Decrypt(cek, iv, ciphertext, tag, aad []byte) ([]byte, error) {
	return c.cipher.Decrypt(cek, iv, ciphertext, tag, aad)
}

func NewGeneric(alg jwa.ContentEncryptionAlgorithm) (*Generic, error) {
	if pdebug.Enabled {
		g := pdebug.FuncMarker()
		defer g.End()
	}

	c, err := cipher.NewAES(alg)
	if err != nil {
		return nil, errors.Wrap(err, `aes crypt: failed to create content cipher`)
	}

	if pdebug.Enabled {
		pdebug.Printf("AES Crypt: cipher.keysize = %d", c.KeySize())
	}

	return &Generic{
		alg:     alg,
		cipher:  c,
		keysize: c.KeySize(),
		tagsize: 16,
	}, nil
}

func (c Generic) KeySize() int {
	return c.keysize
}
