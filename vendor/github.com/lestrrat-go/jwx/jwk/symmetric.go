package jwk

import (
	"context"
	"crypto"
	"fmt"

	"github.com/lestrrat-go/blackmagic"
	"github.com/lestrrat-go/jwx/internal/base64"
	"github.com/pkg/errors"
)

func (k *symmetricKey) FromRaw(rawKey []byte) error {
	k.mu.Lock()
	defer k.mu.Unlock()

	if len(rawKey) == 0 {
		return errors.New(`non-empty []byte key required`)
	}

	k.octets = rawKey

	return nil
}

// Raw returns the octets for this symmetric key.
// Since this is a symmetric key, this just calls Octets
func (k *symmetricKey) Raw(v interface{}) error {
	k.mu.RLock()
	defer k.mu.RUnlock()
	return blackmagic.AssignIfCompatible(v, k.octets)
}

// Thumbprint returns the JWK thumbprint using the indicated
// hashing algorithm, according to RFC 7638
func (k *symmetricKey) Thumbprint(hash crypto.Hash) ([]byte, error) {
	k.mu.RLock()
	defer k.mu.RUnlock()
	var octets []byte
	if err := k.Raw(&octets); err != nil {
		return nil, errors.Wrap(err, `failed to materialize symmetric key`)
	}

	h := hash.New()
	fmt.Fprint(h, `{"k":"`)
	fmt.Fprint(h, base64.EncodeToString(octets))
	fmt.Fprint(h, `","kty":"oct"}`)
	return h.Sum(nil), nil
}

func (k *symmetricKey) PublicKey() (Key, error) {
	newKey := NewSymmetricKey()

	for iter := k.Iterate(context.TODO()); iter.Next(context.TODO()); {
		pair := iter.Pair()
		if err := newKey.Set(pair.Key.(string), pair.Value); err != nil {
			return nil, errors.Wrapf(err, `failed to set field %s`, pair.Key)
		}
	}
	return newKey, nil
}
