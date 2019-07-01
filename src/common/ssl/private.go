package ssl

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"io/ioutil"
	"os"
)

func GetPrivateKey() (*rsa.PrivateKey, []byte, error) {
	if private, privatePEM, err := pullPrivateKeyFromFS(); err == nil {
		return private, privatePEM, nil
	}
	key, keyPEM, err := generateNewPrivateKey()
	if err != nil {
		Clear()
		return nil, nil, err
	}
	if err = savePrivateKeyToFS(keyPEM); err != nil {
		Clear()
		return nil, nil, err
	}
	return key, keyPEM, nil
}

func generateNewPrivateKey() (*rsa.PrivateKey, []byte, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, err
	}
	return key, pem.EncodeToMemory(&pem.Block{
		Type: "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	}), nil
}

func pullPrivateKeyFromFS() (*rsa.PrivateKey, []byte, error) {
	file, err := os.OpenFile(keyPEMPath, os.O_RDONLY, os.ModePerm)
	if err != nil {
		return nil, nil, err
	}
	defer file.Close()

	keyPEM, err := ioutil.ReadAll(file)
	if err != nil {
		return nil, nil, err
	}
	block, _ := pem.Decode(keyPEM)
	priv, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		return nil, nil, err
	}
	return priv, keyPEM, nil
}

func savePrivateKeyToFS(privatePEM []byte) error {
	file, err := os.OpenFile(keyPEMPath, os.O_WRONLY | os.O_CREATE, 0600)
	if err != nil {
		return err
	}
	_, err = file.Write(privatePEM)
	file.Close()
	if err != nil {
		return err
	}
	return nil
}

func clearPrivateKey() {
	os.Remove(keyPEMPath)
}
