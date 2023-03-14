package jwk

import (
	"context"

	"github.com/lestrrat-go/iter/arrayiter"
	"github.com/lestrrat-go/jwx/internal/json"
	"github.com/lestrrat-go/jwx/internal/pool"
	"github.com/pkg/errors"
)

// NewSet creates and empty `jwk.Set` object
func NewSet() Set {
	return &set{}
}

func (s *set) Get(idx int) (Key, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if idx >= 0 && idx < len(s.keys) {
		return s.keys[idx], true
	}
	return nil, false
}

func (s *set) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return len(s.keys)
}

// indexNL is Index(), but without the locking
func (s *set) indexNL(key Key) int {
	for i, k := range s.keys {
		if k == key {
			return i
		}
	}
	return -1
}

func (s *set) Index(key Key) int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.indexNL(key)
}

func (s *set) Add(key Key) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if i := s.indexNL(key); i > -1 {
		return false
	}
	s.keys = append(s.keys, key)
	return true
}

func (s *set) Remove(key Key) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, k := range s.keys {
		if k == key {
			switch i {
			case 0:
				s.keys = s.keys[1:]
			case len(s.keys) - 1:
				s.keys = s.keys[:i]
			default:
				s.keys = append(s.keys[:i], s.keys[i+1:]...)
			}
			return true
		}
	}
	return false
}

func (s *set) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.keys = nil
}

func (s *set) Iterate(ctx context.Context) KeyIterator {
	ch := make(chan *KeyPair, s.Len())
	go iterate(ctx, s.keys, ch)
	return arrayiter.New(ch)
}

func iterate(ctx context.Context, keys []Key, ch chan *KeyPair) {
	defer close(ch)

	for i, key := range keys {
		pair := &KeyPair{Index: i, Value: key}
		select {
		case <-ctx.Done():
			return
		case ch <- pair:
		}
	}
}

type keySetMarshalProxy struct {
	Keys []json.RawMessage `json:"keys"`
}

func (s *set) MarshalJSON() ([]byte, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	buf := pool.GetBytesBuffer()
	defer pool.ReleaseBytesBuffer(buf)
	enc := json.NewEncoder(buf)

	buf.WriteString(`{"keys":[`)
	for i, k := range s.keys {
		if i > 0 {
			buf.WriteByte(',')
		}
		if err := enc.Encode(k); err != nil {
			return nil, errors.Wrapf(err, `failed to marshal key #%d`, i)
		}
	}
	buf.WriteString("]}")

	ret := make([]byte, buf.Len())
	copy(ret, buf.Bytes())
	return ret, nil
}

func (s *set) UnmarshalJSON(data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	var proxy keySetMarshalProxy
	if err := json.Unmarshal(data, &proxy); err != nil {
		return errors.Wrap(err, `failed to unmarshal into Key (proxy)`)
	}

	var options []ParseOption
	if dc := s.dc; dc != nil {
		if localReg := dc.Registry(); localReg != nil {
			options = append(options, withLocalRegistry(localReg))
		}
	}

	if len(proxy.Keys) == 0 {
		k, err := ParseKey(data, options...)
		if err != nil {
			return errors.Wrap(err, `failed to unmarshal key from JSON headers`)
		}
		s.keys = append(s.keys, k)
	} else {
		for i, buf := range proxy.Keys {
			k, err := ParseKey([]byte(buf), options...)
			if err != nil {
				return errors.Wrapf(err, `failed to unmarshal key #%d (total %d) from multi-key JWK set`, i+1, len(proxy.Keys))
			}
			s.keys = append(s.keys, k)
		}
	}
	return nil
}

func (s *set) LookupKeyID(kid string) (Key, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for iter := s.Iterate(context.TODO()); iter.Next(context.TODO()); {
		pair := iter.Pair()
		key := pair.Value.(Key) //nolint:forcetypeassert
		if key.KeyID() == kid {
			return key, true
		}
	}
	return nil, false
}

func (s *set) DecodeCtx() DecodeCtx {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.dc
}

func (s *set) SetDecodeCtx(dc DecodeCtx) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.dc = dc
}

func (s *set) Clone() (Set, error) {
	s2 := &set{}

	s.mu.RLock()
	defer s.mu.RUnlock()

	s2.keys = make([]Key, len(s.keys))

	for i := 0; i < len(s.keys); i++ {
		s2.keys[i] = s.keys[i]
	}
	return s2, nil
}
