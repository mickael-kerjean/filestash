package utils

import (
	"bytes"
	"compress/zlib"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"hash/fnv"
	"io"
	"math/big"
	mathrand "math/rand"
	"sort"
	"sync"
	"sync/atomic"

	"github.com/mickael-kerjean/filestash/server/pkg/env"
)

var (
	Letters  = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	GCMNonce = NewNonceGenerator()
)

func EncryptString(secret string, data string) (string, error) {
	d, err := compress([]byte(data))
	if err != nil {
		return "", err
	}
	d, err = EncryptAESGCM([]byte(secret), d)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(d), nil
}

func DecryptString(secret string, data string) (string, error) {
	d, err := base64.URLEncoding.DecodeString(data)
	if err != nil {
		return "", err
	}
	d, err = DecryptAESGCM([]byte(secret), d)
	if err != nil {
		return "", err
	}
	d, err = decompress(d)
	if err != nil {
		return "", err
	}
	return string(d), nil
}

func Hash(str string, n int) string {
	hasher := sha256.New()
	hasher.Write([]byte(str))
	return hashSize(hasher.Sum(nil), n)
}

func QuickHash(str string, n int) string {
	hasher := fnv.New64()
	hasher.Write([]byte(str))
	return hashSize(hasher.Sum(nil), n)
}

func HashStream(r io.Reader, n int) string {
	hasher := sha256.New()
	io.Copy(hasher, r)
	h := hex.EncodeToString(hasher.Sum(nil))
	if n == 0 {
		return h
	} else if n >= len(h) {
		return h
	}
	return h[0:n]
}

func hashSize(b []byte, n int) string {
	h := ""
	for i := 0; i < len(b); i++ {
		if n > 0 && len(h) >= n {
			break
		}
		h += ReversedBaseChange(Letters, int(b[i]))
	}

	if len(h) > n {
		return h[0 : len(h)-1]
	}
	return h
}

func ReversedBaseChange(alphabet []rune, i int) string {
	str := ""
	for {
		str += string(alphabet[i%len(alphabet)])
		i = i / len(alphabet)
		if i == 0 {
			break
		}
	}
	return str
}

func RandomString(n int) string {
	b := make([]rune, n)
	for i := range b {
		max := *big.NewInt(int64(len(Letters)))
		r, err := rand.Int(rand.Reader, &max)
		if err != nil {
			b[i] = Letters[0]
		} else {
			b[i] = Letters[r.Int64()]
		}
	}
	return string(b)
}

func QuickString(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = Letters[mathrand.Intn(len(Letters))]
	}
	return string(b)
}

func EncryptAESGCM(key []byte, plaintext []byte) ([]byte, error) {
	c, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(c)
	if err != nil {
		return nil, err
	}

	nonce := GCMNonce.Next()
	if gcm.NonceSize() != len(nonce) {
		return nil, errors.ErrUnsupported
	}
	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

func DecryptAESGCM(key []byte, ciphertext []byte) ([]byte, error) {
	c, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(c)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	return gcm.Open(nil, nonce, ciphertext, nil)
}

func compress(something []byte) ([]byte, error) {
	var b bytes.Buffer
	w := zlib.NewWriter(&b)
	w.Write(something)
	w.Close()
	return b.Bytes(), nil
}

var zrPool = sync.Pool{
	New: func() any {
		nop := []byte{120, 156, 3, 0, 0, 0, 0, 1}
		r, _ := zlib.NewReader(bytes.NewReader(nop))
		return r
	},
}

func decompress(something []byte) ([]byte, error) {
	r := zrPool.Get().(io.ReadCloser)
	defer zrPool.Put(r)
	if err := r.(zlib.Resetter).Reset(bytes.NewReader(something), nil); err != nil {
		return nil, err
	}
	defer r.Close()
	return io.ReadAll(r)
}

// Create a unique ID that can be use to identify different session
func GenerateID(params map[string]string) string {
	p := ""
	orderedKeys := make([]string, len(params))
	for key, _ := range params {
		orderedKeys = append(orderedKeys, key)
	}
	sort.Strings(orderedKeys)

	for _, key := range orderedKeys {
		switch key {
		case "password":
		case "path":
		case "session":
		case "timestamp":
		default:
			if val := params[key]; val != "" {
				p += key + "=>" + params[key] + ", "
			}
		}
	}
	if p == "" {
		return "na"
	}
	p += "salt=>" + env.SECRET_KEY
	return Hash(p, 20)
}

type NonceGenerator struct {
	start   [12]byte
	current atomic.Uint64
}

func NewNonceGenerator() *NonceGenerator {
	g := NonceGenerator{}
	if _, err := io.ReadFull(rand.Reader, g.start[:]); err != nil {
		panic(err)
	}
	g.current.Store(binary.BigEndian.Uint64(g.start[4:]))
	return &g
}

func (this *NonceGenerator) Next() []byte {
	out := make([]byte, 12)
	copy(out[:4], this.start[:4])
	binary.BigEndian.PutUint64(out[4:12], this.current.Add(1))
	return out
}
