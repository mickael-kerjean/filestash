package jws

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/rand"

	"github.com/lestrrat-go/jwx/internal/keyconv"
	"github.com/lestrrat-go/jwx/internal/pool"
	"github.com/lestrrat-go/jwx/jwa"
	"github.com/pkg/errors"
)

var ecdsaSignFuncs = map[jwa.SignatureAlgorithm]ecdsaSignFunc{}
var ecdsaVerifyFuncs = map[jwa.SignatureAlgorithm]ecdsaVerifyFunc{}

func init() {
	algs := map[jwa.SignatureAlgorithm]crypto.Hash{
		jwa.ES256:  crypto.SHA256,
		jwa.ES384:  crypto.SHA384,
		jwa.ES512:  crypto.SHA512,
		jwa.ES256K: crypto.SHA256,
	}

	for alg, h := range algs {
		ecdsaSignFuncs[alg] = makeECDSASignFunc(h)
		ecdsaVerifyFuncs[alg] = makeECDSAVerifyFunc(h)
	}
}

func makeECDSASignFunc(hash crypto.Hash) ecdsaSignFunc {
	return func(payload []byte, key *ecdsa.PrivateKey) ([]byte, error) {
		curveBits := key.Curve.Params().BitSize
		keyBytes := curveBits / 8
		// Curve bits do not need to be a multiple of 8.
		if curveBits%8 > 0 {
			keyBytes++
		}
		h := hash.New()
		if _, err := h.Write(payload); err != nil {
			return nil, errors.Wrap(err, "failed to write payload using ecdsa")
		}
		r, s, err := ecdsa.Sign(rand.Reader, key, h.Sum(nil))
		if err != nil {
			return nil, errors.Wrap(err, "failed to sign payload using ecdsa")
		}

		rBytes := r.Bytes()
		rBytesPadded := make([]byte, keyBytes)
		copy(rBytesPadded[keyBytes-len(rBytes):], rBytes)

		sBytes := s.Bytes()
		sBytesPadded := make([]byte, keyBytes)
		copy(sBytesPadded[keyBytes-len(sBytes):], sBytes)

		out := append(rBytesPadded, sBytesPadded...)
		return out, nil
	}
}

func newECDSASigner(alg jwa.SignatureAlgorithm) Signer {
	return &ECDSASigner{
		alg:  alg,
		sign: ecdsaSignFuncs[alg], // we know this will succeed
	}
}

func (s ECDSASigner) Algorithm() jwa.SignatureAlgorithm {
	return s.alg
}

func (s ECDSASigner) Sign(payload []byte, key interface{}) ([]byte, error) {
	if key == nil {
		return nil, errors.New(`missing private key while signing payload`)
	}

	var privkey ecdsa.PrivateKey
	if err := keyconv.ECDSAPrivateKey(&privkey, key); err != nil {
		return nil, errors.Wrapf(err, `failed to retrieve ecdsa.PrivateKey out of %T`, key)
	}

	return s.sign(payload, &privkey)
}

func makeECDSAVerifyFunc(hash crypto.Hash) ecdsaVerifyFunc {
	return func(payload []byte, signature []byte, key *ecdsa.PublicKey) error {
		r := pool.GetBigInt()
		s := pool.GetBigInt()
		defer pool.ReleaseBigInt(r)
		defer pool.ReleaseBigInt(s)

		n := len(signature) / 2
		r.SetBytes(signature[:n])
		s.SetBytes(signature[n:])

		h := hash.New()
		if _, err := h.Write(payload); err != nil {
			return errors.Wrap(err, "failed to write payload using ecdsa")
		}

		if !ecdsa.Verify(key, h.Sum(nil), r, s) {
			return errors.New(`failed to verify signature using ecdsa`)
		}
		return nil
	}
}

func newECDSAVerifier(alg jwa.SignatureAlgorithm) Verifier {
	return &ECDSAVerifier{
		verify: ecdsaVerifyFuncs[alg], // we know this will succeed
	}
}

func (v ECDSAVerifier) Verify(payload []byte, signature []byte, key interface{}) error {
	if key == nil {
		return errors.New(`missing public key while verifying payload`)
	}

	var pubkey ecdsa.PublicKey
	if err := keyconv.ECDSAPublicKey(&pubkey, key); err != nil {
		return errors.Wrapf(err, `failed to retrieve ecdsa.PublicKey out of %T`, key)
	}

	return v.verify(payload, signature, &pubkey)
}
