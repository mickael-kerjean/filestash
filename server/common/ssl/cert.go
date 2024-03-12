package ssl

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"io/ioutil"
	"os"
)

func GetCertificate(key *rsa.PrivateKey, root *x509.Certificate) (*x509.Certificate, []byte, error) {
	if cert, certPEM, err := pullCertificateFromFS(); err == nil {
		return cert, certPEM, nil
	}
	cert, certPEM, err := generateNewCertificate(root, key)
	if err != nil {
		Clear()
		return nil, nil, err
	}
	if err = saveCertificateToFS(certPEM); err != nil {
		Clear()
		return nil, nil, err
	}
	return cert, certPEM, nil
}

func generateNewCertificate(root *x509.Certificate, key *rsa.PrivateKey) (*x509.Certificate, []byte, error) {
	certDER, err := x509.CreateCertificate(rand.Reader, root, root, &key.PublicKey, key)
	if err != nil {
		return nil, nil, err
	}
	cert, err := x509.ParseCertificate(certDER)
	if err != nil {
		return nil, nil, err
	}
	return cert, pem.EncodeToMemory(&pem.Block{
		Type: "CERTIFICATE", Bytes: certDER,
	}), nil
}

func pullCertificateFromFS() (*x509.Certificate, []byte, error) {
	file, err := os.OpenFile(certPEMPath(), os.O_RDONLY, os.ModePerm)
	if err != nil {
		return nil, nil, err
	}
	defer file.Close()
	certPEM, err := ioutil.ReadAll(file)
	if err != nil {
		return nil, nil, err
	}
	block, _ := pem.Decode(certPEM)
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, nil, err
	}
	return cert, certPEM, nil
}

func saveCertificateToFS(certPEM []byte) error {
	file, err := os.OpenFile(certPEMPath(), os.O_WRONLY|os.O_CREATE, 0600)
	if err != nil {
		return err
	}
	_, err = file.Write(certPEM)
	file.Close()
	return err

}

func clearCert() {
	os.Remove(certPEMPath())
}
