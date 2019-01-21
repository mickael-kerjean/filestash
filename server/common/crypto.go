package common

import (
	"bytes"
	"compress/zlib"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"io"
	"io/ioutil"
	mathrand "math/rand"
	"math/big"
)

var Letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

func EncryptString(secret string, json string) (string, error) {
	d, err := compress([]byte(json))
	if err != nil {
		return "", err
	}
	d, err = encrypt([]byte(secret), d)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(d), nil
}

func DecryptString(secret string, data string) (string, error){
	d, err := base64.URLEncoding.DecodeString(data)
	if err != nil {
		return "", err
	}
	d, err = decrypt([]byte(secret), d)
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
	d := hasher.Sum(nil)
	h := ""
	for i:=0; i<len(d); i++ {
		if n > 0 && len(h) >= n {
			break
		}
		h += ReversedBaseChange(Letters, int(d[i]))
	}

	if len(h) > n {
		return h[0:len(h) - 1]
	}
	return h
}

func ReversedBaseChange(alphabet []rune, i int) string {
	str := ""
	for {
		str += string(alphabet[i % len(alphabet)])
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

func encrypt(key []byte, plaintext []byte) ([]byte, error) {
    c, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }

    gcm, err := cipher.NewGCM(c)
    if err != nil {
        return nil, err
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }

    return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

func decrypt(key []byte, ciphertext []byte) ([]byte, error) {
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
        return nil, NewError("ciphertext too short", 500)
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

func decompress(something []byte) ([]byte, error) {
	b := bytes.NewBuffer(something)
	r, err := zlib.NewReader(b)
	if err != nil {
		return []byte(""), nil
	}
	r.Close()
	return ioutil.ReadAll(r)
}

func sign(something []byte) ([]byte, error) {
	return something, nil
}

func verify(something []byte) ([]byte, error) {
	return something, nil
}

// Create a unique ID that can be use to identify different session
func GenerateID(ctx *App) string {
	p := ""
	params := ctx.Session
	if params["type"] != "" {
		p += "type =>" + params["type"]
	}
	if params["host"] != "" {
		p += "host =>" + params["host"]
	}
	if params["hostname"] != "" {
		p += "hostname =>" + params["hostname"]
	}
	if params["username"] != "" {
		p += "username =>" + params["username"]
	}
	if params["user"] != "" {
		p += "user =>" + params["user"]
	}
	if params["repo"] != "" {
		p += "repo =>" + params["repo"]
	}
	if params["access_key_id"] != "" {
		p += "access_key_id =>" + params["access_key_id"]
	}
	if params["endpoint"] != "" {
		p += "endpoint =>" + params["endpoint"]
	}
	if params["bearer"] != "" {
		p += "bearer =>" + params["bearer"]
	}
	if params["token"] != "" {
		p += "token =>" + params["token"]
	}

	if p == "" {
		return Hash("N/A", 20)
	}
	p += "salt => " + SECRET_KEY
	return Hash(p, 20)
}
