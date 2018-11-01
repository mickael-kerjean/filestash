package common

import (
	"bytes"
	"compress/zlib"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
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

func Hash(str string) string {
	hasher := sha1.New()
	hasher.Write([]byte(str))
	return "sha1::" + base32.HexEncoding.EncodeToString(hasher.Sum(nil))
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
	params := ctx.Session
	p := "type =>" + params["type"]
	p += "salt => " + ctx.Config.Get("general.secret_key").String()
	p += "host =>" + params["host"]
	p += "hostname =>" + params["hostname"]
	p += "username =>" + params["username"]
	p += "user =>" + params["user"]
	p += "repo =>" + params["repo"]
	p += "access_key_id =>" + params["access_key_id"]
	p += "endpoint =>" + params["endpoint"]
	p += "bearer =>" + params["bearer"]
	p += "token =>" + params["token"]
	return Hash(p)
}
