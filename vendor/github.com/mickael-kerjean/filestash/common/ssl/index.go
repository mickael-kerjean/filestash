package ssl

import (
	. "github.com/mickael-kerjean/filestash/server/common"
	"path/filepath"
	"os"
)

var keyPEMPath  string = filepath.Join(GetCurrentDir(), CERT_PATH, "key.pem")
var certPEMPath string = filepath.Join(GetCurrentDir(), CERT_PATH, "cert.pem")

func init() {
	os.MkdirAll(filepath.Join(GetCurrentDir(), CERT_PATH), os.ModePerm)
}

func Clear() {
	clearPrivateKey()
	clearCert()
}
