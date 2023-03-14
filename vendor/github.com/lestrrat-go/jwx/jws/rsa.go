package jws

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"

	"github.com/lestrrat-go/jwx/internal/keyconv"
	"github.com/lestrrat-go/jwx/jwa"
	"github.com/pkg/errors"
)

var rsaSignFuncs = map[jwa.SignatureAlgorithm]rsaSignFunc{}
var rsaVerifyFuncs = map[jwa.SignatureAlgorithm]rsaVerifyFunc{}

func init() {
	algs := map[jwa.SignatureAlgorithm]struct {
		SignFunc   func(crypto.Hash) rsaSignFunc
		VerifyFunc func(crypto.Hash) rsaVerifyFunc
		Hash       crypto.Hash
	}{
		jwa.RS256: {
			Hash:       crypto.SHA256,
			SignFunc:   makeSignPKCS1v15,
			VerifyFunc: makeVerifyPKCS1v15,
		},
		jwa.RS384: {
			Hash:       crypto.SHA384,
			SignFunc:   makeSignPKCS1v15,
			VerifyFunc: makeVerifyPKCS1v15,
		},
		jwa.RS512: {
			Hash:       crypto.SHA512,
			SignFunc:   makeSignPKCS1v15,
			VerifyFunc: makeVerifyPKCS1v15,
		},
		jwa.PS256: {
			Hash:       crypto.SHA256,
			SignFunc:   makeSignPSS,
			VerifyFunc: makeVerifyPSS,
		},
		jwa.PS384: {
			Hash:       crypto.SHA384,
			SignFunc:   makeSignPSS,
			VerifyFunc: makeVerifyPSS,
		},
		jwa.PS512: {
			Hash:       crypto.SHA512,
			SignFunc:   makeSignPSS,
			VerifyFunc: makeVerifyPSS,
		},
	}

	for alg, item := range algs {
		rsaSignFuncs[alg] = item.SignFunc(item.Hash)
		rsaVerifyFuncs[alg] = item.VerifyFunc(item.Hash)
	}
}

func makeSignPKCS1v15(hash crypto.Hash) rsaSignFunc {
	return func(payload []byte, key *rsa.PrivateKey) ([]byte, error) {
		h := hash.New()
		if _, err := h.Write(payload); err != nil {
			return nil, errors.Wrap(err, "failed to write payload using SignPKCS1v15")
		}
		return rsa.SignPKCS1v15(rand.Reader, key, hash, h.Sum(nil))
	}
}

func makeSignPSS(hash crypto.Hash) rsaSignFunc {
	return func(payload []byte, key *rsa.PrivateKey) ([]byte, error) {
		h := hash.New()
		if _, err := h.Write(payload); err != nil {
			return nil, errors.Wrap(err, "failed to write payload using SignPSS")
		}
		return rsa.SignPSS(rand.Reader, key, hash, h.Sum(nil), &rsa.PSSOptions{
			SaltLength: rsa.PSSSaltLengthEqualsHash,
		})
	}
}

func newRSASigner(alg jwa.SignatureAlgorithm) Signer {
	return &RSASigner{
		alg:  alg,
		sign: rsaSignFuncs[alg], // we know this will succeed
	}
}

func (s RSASigner) Algorithm() jwa.SignatureAlgorithm {
	return s.alg
}

// Sign creates a signature using crypto/rsa. key must be a non-nil instance of
// `*"crypto/rsa".PrivateKey`.
func (s RSASigner) Sign(payload []byte, key interface{}) ([]byte, error) {
	if key == nil {
		return nil, errors.New(`missing private key while signing payload`)
	}

	var privkey rsa.PrivateKey
	if err := keyconv.RSAPrivateKey(&privkey, key); err != nil {
		return nil, errors.Wrapf(err, `failed to retrieve rsa.PrivateKey out of %T`, key)
	}

	return s.sign(payload, &privkey)
}

func makeVerifyPKCS1v15(hash crypto.Hash) rsaVerifyFunc {
	return func(payload, signature []byte, key *rsa.PublicKey) error {
		h := hash.New()
		if _, err := h.Write(payload); err != nil {
			return errors.Wrap(err, "failed to write payload using PKCS1v15")
		}

		return rsa.VerifyPKCS1v15(key, hash, h.Sum(nil), signature)
	}
}

func makeVerifyPSS(hash crypto.Hash) rsaVerifyFunc {
	return func(payload, signature []byte, key *rsa.PublicKey) error {
		h := hash.New()
		if _, err := h.Write(payload); err != nil {
			return errors.Wrap(err, "failed to write payload using PSS")
		}
		return rsa.VerifyPSS(key, hash, h.Sum(nil), signature, nil)
	}
}

func newRSAVerifier(alg jwa.SignatureAlgorithm) Verifier {
	return &RSAVerifier{
		verify: rsaVerifyFuncs[alg], // we know this will succeed
	}
}

func (v RSAVerifier) Verify(payload, signature []byte, key interface{}) error {
	if key == nil {
		return errors.New(`missing public key while verifying payload`)
	}

	var pubkey rsa.PublicKey
	if err := keyconv.RSAPublicKey(&pubkey, key); err != nil {
		return errors.Wrapf(err, `failed to retrieve rsa.PublicKey out of %T`, key)
	}

	return v.verify(payload, signature, &pubkey)
}
