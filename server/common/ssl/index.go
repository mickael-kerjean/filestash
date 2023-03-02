package ssl

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"os"
)

var keyPEMPath string = GetAbsolutePath(CERT_PATH, "key.pem")
var certPEMPath string = GetAbsolutePath(CERT_PATH, "cert.pem")

func init() {
	os.MkdirAll(GetAbsolutePath(CERT_PATH), os.ModePerm)
}

func Clear() {
	clearPrivateKey()
	clearCert()
}
