package control

// KeyVal is a simple key-value struct. In cases where Val can be nil, an empty
// string represents that unless ValSetAndEmpty is true.
type KeyVal struct {
	// Key is the always-present key
	Key string

	// Val is the value. If it's an empty string and nils are accepted/supported
	// where this is used, it means nil unless ValSetAndEmpty is true.
	Val string

	// ValSetAndEmpty is true when Val is an empty string, the associated
	// command supports nils, and Val should NOT be treated as nil. False
	// otherwise.
	ValSetAndEmpty bool
}

// NewKeyVal creates a new key-value pair.
func NewKeyVal(key string, val string) *KeyVal {
	return &KeyVal{Key: key, Val: val}
}

// KeyVals creates multiple new key-value pairs from the given strings. The
// provided set of strings must have a length that is a multiple of 2.
func KeyVals(keysAndVals ...string) []*KeyVal {
	if len(keysAndVals)%2 != 0 {
		panic("Expected multiple of 2")
	}
	ret := make([]*KeyVal, len(keysAndVals)/2)
	for i := 0; i < len(ret); i++ {
		ret[i] = NewKeyVal(keysAndVals[i*2], keysAndVals[i*2+1])
	}
	return ret
}

// ValSet returns true if Val is either non empty or ValSetAndEmpty is true.
func (k *KeyVal) ValSet() bool {
	return len(k.Val) > 0 || k.ValSetAndEmpty
}
