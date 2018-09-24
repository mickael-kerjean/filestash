package common

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/base64"
	"encoding/json"
	"io"
)

func Encrypt(keystr string, text map[string]string) (string, error) {
	key := []byte(keystr)
	plaintext, err := json.Marshal(text)
	if err != nil {
		return "", NewError("json marshalling: "+err.Error(), 500)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", NewError("encryption issue (cipher): "+err.Error(), 500)
	}
	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", NewError("encryption issue: "+err.Error(), 500)
	}
	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintext)
	return base64.URLEncoding.EncodeToString(ciphertext), nil
}

func Decrypt(keystr string, cryptoText string) (map[string]string, error) {
	var raw map[string]string

	key := []byte(keystr)
	ciphertext, _ := base64.URLEncoding.DecodeString(cryptoText)
	block, err := aes.NewCipher(key)

	if err != nil || len(ciphertext) < aes.BlockSize {
		return raw, NewError("Cipher is too short", 500)
	}

	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]
	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)

	json.Unmarshal(ciphertext, &raw)
	return raw, nil
}

func GenerateID(params map[string]string) string {	
	p := "type =>" + params["type"]
	p += "host =>" + params["host"]
	p += "hostname =>" + params["hostname"]
	p += "username =>" + params["username"]
	p += "user =>" + params["user"]
	p += "repo =>" + params["repo"]
	p += "access_key_id =>" + params["access_key_id"]
	p += "endpoint =>" + params["endpoint"]
	p += "bearer =>" + params["bearer"]
	p += "token =>" + params["token"]
	hasher := sha1.New()
	hasher.Write([]byte(p))
	return "sha1::" + base32.HexEncoding.EncodeToString(hasher.Sum(nil))
}
