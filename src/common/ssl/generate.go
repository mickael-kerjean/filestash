package ssl

import (
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	. "github.com/BobCashStory/filestash/server/common"
)

func GenerateSelfSigned() (tls.Certificate, *x509.CertPool, error) {
	var err     error
	var key     *rsa.PrivateKey
	var root    *x509.Certificate
	var keyPEM  []byte
	var certPEM []byte
	var TLSCert tls.Certificate

	if key, keyPEM, err = GetPrivateKey(); err != nil {
		Log.Error("[https] key_generation %v", err)
		Clear()
		return TLSCert, nil, err
	}
	if root, err = GetRoot(); err != nil {
		Log.Error("[https] root_certificate %v", err)
		Clear()
		return TLSCert, nil, err
	}
	if _, certPEM, err = GetCertificate(key, root); err != nil {
		Log.Error("[https] x509_certificate %v", err)
		Clear()
		return TLSCert, nil, err
	}
	if TLSCert, err = tls.X509KeyPair(certPEM, keyPEM); err != nil {
		Log.Error("[https] tls_certificate %v", err)
		Clear()
		return TLSCert, nil, err
	}

	roots := x509.NewCertPool()
	if ok := roots.AppendCertsFromPEM([]byte(certPEM)); ok == false {
		Log.Error("[https] tls_client")
		Clear()
		return TLSCert, nil, err
	}
	return TLSCert, roots, nil
}
